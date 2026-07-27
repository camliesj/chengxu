package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand
import com.chengxu.autoservice.core.orders.model.PendingStatusEnvelope
import com.chengxu.autoservice.core.orders.model.PendingStatusRecovery
import com.chengxu.autoservice.core.orders.model.allowedOrderTransition
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException

interface OrderStatusLocalStore : OrderDetailLocalStore {
    suspend fun getPendingStatus(companyId: String, orderId: String): PendingStatusEnvelope?
    suspend fun savePending(companyId: String, envelope: PendingStatusEnvelope)
    suspend fun deletePendingStatus(companyId: String, orderId: String)
}

interface OrderStatusRepository {
    suspend fun change(orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail>
    suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail>
    suspend fun restorePending(orderId: String): PendingStatusRecovery?
}

class DefaultOrderStatusRepository(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val readApi: OrderReadApi,
    private val api: OrderStatusApi,
    private val localStore: OrderStatusLocalStore,
    private val summaryStore: OrderCreationSummaryStore,
    private val sessionInvalidator: SessionInvalidator,
) : OrderStatusRepository {
    override suspend fun change(orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        val envelope = loadDetailForChange(session, orderId) ?: return OrderCommandResult.Forbidden
        if (BusinessCapability.ADVANCE_ORDER_STATUS !in envelope.capabilities ||
            command.expectedVersion != envelope.order.summary.version ||
            !allowedOrderTransition(session.role, currentStatus(envelope.order), command.targetStatus)
        ) return OrderCommandResult.Forbidden
        return handleResult(session, orderId, api.change(session.token, orderId, command), command)
    }

    override suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        return handleResult(session, null, api.queryOperation(session.token, operationId), null)
    }

    override suspend fun restorePending(orderId: String): PendingStatusRecovery? {
        val session = sessionRepository.session.value ?: return null
        val pending = localStore.getPendingStatus(session.companyId, orderId) ?: return null
        if (!isOnline()) return PendingStatusRecovery(pending, OrderCommandResult.NetworkUnavailable)
        return PendingStatusRecovery(pending, handleResult(session, orderId, api.queryOperation(session.token, pending.operationId), null))
    }

    private suspend fun loadDetailForChange(session: AppSession, orderId: String): OrderDetailEnvelope? = when (val result = readApi.fetchDetail(session.token, orderId)) {
        is OrderReadResult.Success -> result.value.takeIf { it.order.summary.companyId == session.companyId }?.also { localStore.upsertDetail(it.order) }
        is OrderReadResult.Failure -> {
            when (result.reason) {
                OrderReadFailure.Unauthorized -> sessionInvalidator.invalidate()
                OrderReadFailure.NotFound -> localStore.deleteDetail(session.companyId, orderId)
                else -> Unit
            }
            null
        }
    }

    private suspend fun handleResult(
        session: AppSession,
        requestedOrderId: String?,
        result: OrderCommandResult<OrderDetail>,
        command: OrderStatusCommand?,
    ): OrderCommandResult<OrderDetail> = when (result) {
        is OrderCommandResult.Success -> if (result.value.summary.companyId != session.companyId ||
            (requestedOrderId != null && result.value.summary.id != requestedOrderId)
        ) OrderCommandResult.MalformedResponse else {
            persist(result.value)
            result
        }
        is OrderCommandResult.UnknownResult -> {
            if (requestedOrderId != null && command != null) localStore.savePending(session.companyId, PendingStatusEnvelope(
                orderId = requestedOrderId, operationId = result.operationId, expectedVersion = command.expectedVersion,
                targetStatus = command.targetStatus.wireValue, createdAtMillis = System.currentTimeMillis(),
            ))
            result
        }
        OrderCommandResult.Unauthorized -> { sessionInvalidator.invalidate(); result }
        OrderCommandResult.NotFound -> { requestedOrderId?.let { localStore.deleteDetail(session.companyId, it) }; result }
        is OrderCommandResult.Conflict -> {
            result.latest?.takeIf { it.summary.companyId == session.companyId }?.let { persist(it) }
            requestedOrderId?.let { localStore.deletePendingStatus(session.companyId, it) }
            result
        }
        else -> result
    }

    private suspend fun persist(detail: OrderDetail) {
        try {
            localStore.upsertDetail(detail)
            summaryStore.upsert(detail.summary)
            localStore.deletePendingStatus(detail.summary.companyId, detail.summary.id)
        } catch (cancellation: CancellationException) { throw cancellation }
    }

    private fun currentStatus(detail: OrderDetail) = OrderStatus.fromWire(detail.summary.status) ?: OrderStatus.SETTLED
    private fun isOnline() = networkMonitor.connection.value == ConnectionState.Online
}
