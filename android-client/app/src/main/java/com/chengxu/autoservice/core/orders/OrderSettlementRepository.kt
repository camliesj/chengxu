package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.model.SettlementCommand
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository

interface OrderSettlementLocalStore : OrderDetailLocalStore

interface OrderSettlementRepository {
    suspend fun settle(orderId: String, command: SettlementCommand): OrderCommandResult<OrderDetail>
    suspend fun reverse(orderId: String, operationId: String, expectedVersion: Long): OrderCommandResult<OrderDetail>
    suspend fun updateReceipt(orderId: String, operationId: String, expectedVersion: Long, receipt: ReceiptMetadata?): OrderCommandResult<OrderDetail>
}

class DefaultOrderSettlementRepository(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val readApi: OrderReadApi,
    private val api: OrderSettlementApi,
    private val localStore: OrderSettlementLocalStore,
    private val summaryStore: OrderCreationSummaryStore,
    private val sessionInvalidator: SessionInvalidator,
) : OrderSettlementRepository {
    override suspend fun settle(orderId: String, command: SettlementCommand) = mutate(orderId, command.expectedVersion, setOf(BusinessCapability.SETTLE_ORDER, BusinessCapability.MAINTAIN_RECEIPT)) { session ->
        api.settle(session.token, orderId, command)
    }

    override suspend fun reverse(orderId: String, operationId: String, expectedVersion: Long) = mutate(orderId, expectedVersion, setOf(BusinessCapability.REVERSE_SETTLEMENT)) { session ->
        api.reverse(session.token, orderId, operationId, expectedVersion)
    }

    override suspend fun updateReceipt(orderId: String, operationId: String, expectedVersion: Long, receipt: ReceiptMetadata?) = mutate(orderId, expectedVersion, setOf(BusinessCapability.MAINTAIN_RECEIPT)) { session ->
        api.updateReceipt(session.token, orderId, operationId, expectedVersion, receipt)
    }

    private suspend fun mutate(orderId: String, version: Long, required: Set<BusinessCapability>, call: suspend (AppSession) -> OrderCommandResult<OrderDetail>): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (networkMonitor.connection.value != ConnectionState.Online) return OrderCommandResult.NetworkUnavailable
        if (session.role != UserRole.ADMINISTRATOR) return OrderCommandResult.Forbidden
        val envelope = when (val loaded = readApi.fetchDetail(session.token, orderId)) {
            is OrderReadResult.Success -> loaded.value
            is OrderReadResult.Failure -> return loaded.reason.toCommandResult(orderId, session)
        }
        if (envelope.order.summary.companyId != session.companyId || envelope.order.summary.version != version || !envelope.capabilities.containsAll(required)) return OrderCommandResult.Forbidden
        val status = OrderStatus.fromWire(envelope.order.summary.status)
        if (BusinessCapability.SETTLE_ORDER in required && status != OrderStatus.PENDING_SETTLEMENT) return OrderCommandResult.Forbidden
        if (BusinessCapability.REVERSE_SETTLEMENT in required && status != OrderStatus.SETTLED) return OrderCommandResult.Forbidden
        return handle(session, orderId, call(session))
    }

    private suspend fun handle(session: AppSession, orderId: String, result: OrderCommandResult<OrderDetail>): OrderCommandResult<OrderDetail> = when (result) {
        is OrderCommandResult.Success -> if (result.value.summary.companyId != session.companyId || result.value.summary.id != orderId) OrderCommandResult.MalformedResponse else { persist(result.value); result }
        is OrderCommandResult.Conflict -> { result.latest?.takeIf { it.summary.companyId == session.companyId }?.let { persist(it) }; result }
        OrderCommandResult.Unauthorized -> { sessionInvalidator.invalidate(); result }
        OrderCommandResult.NotFound -> { localStore.deleteDetail(session.companyId, orderId); result }
        else -> result
    }

    private suspend fun persist(detail: OrderDetail) { localStore.upsertDetail(detail); summaryStore.upsert(detail.summary) }

    private suspend fun OrderReadFailure.toCommandResult(orderId: String, session: AppSession): OrderCommandResult<OrderDetail> = when (this) {
        OrderReadFailure.Unauthorized -> { sessionInvalidator.invalidate(); OrderCommandResult.Unauthorized }
        OrderReadFailure.NotFound -> { localStore.deleteDetail(session.companyId, orderId); OrderCommandResult.NotFound }
        OrderReadFailure.NetworkUnavailable -> OrderCommandResult.NetworkUnavailable
        else -> OrderCommandResult.MalformedResponse
    }
}
