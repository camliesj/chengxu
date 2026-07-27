package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository

interface OrderDetailLocalStore {
    suspend fun getDetail(companyId: String, orderId: String): OrderDetail?
    suspend fun upsertDetail(detail: OrderDetail)
    suspend fun deleteDetail(companyId: String, orderId: String)
}

interface OrderDetailRepository {
    suspend fun load(orderId: String): OrderReadResult<OrderDetailEnvelope>
}

class DefaultOrderDetailRepository(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val api: OrderReadApi,
    private val localStore: OrderDetailLocalStore,
    private val sessionInvalidator: SessionInvalidator,
) : OrderDetailRepository {
    override suspend fun load(orderId: String): OrderReadResult<OrderDetailEnvelope> {
        val session = sessionRepository.session.value ?: return OrderReadResult.Failure(OrderReadFailure.Unauthorized)
        if (networkMonitor.connection.value != ConnectionState.Online) {
            return localStore.getDetail(session.companyId, orderId)?.let {
                OrderReadResult.Success(OrderDetailEnvelope(it, emptySet(), ""))
            } ?: OrderReadResult.Failure(OrderReadFailure.NetworkUnavailable)
        }
        return when (val result = api.fetchDetail(session.token, orderId)) {
            is OrderReadResult.Success -> {
                if (result.value.order.summary.companyId != session.companyId) {
                    OrderReadResult.Failure(OrderReadFailure.MalformedResponse)
                } else {
                    localStore.upsertDetail(result.value.order)
                    result
                }
            }
            is OrderReadResult.Failure -> {
                when (result.reason) {
                    OrderReadFailure.NotFound -> localStore.deleteDetail(session.companyId, orderId)
                    OrderReadFailure.Unauthorized -> sessionInvalidator.invalidate()
                    else -> Unit
                }
                result
            }
        }
    }
}
