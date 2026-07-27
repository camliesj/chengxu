package com.chengxu.autoservice.ui.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderDetailRepository
import com.chengxu.autoservice.core.orders.OrderReadResult
import com.chengxu.autoservice.core.orders.OrderStatusRepository
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class OrderStatusViewModel(
    private val repository: OrderStatusRepository,
    private val detailRepository: OrderDetailRepository,
    private val networkMonitor: NetworkMonitor,
    private val operationIdFactory: () -> String,
) : ViewModel() {
    private val mutableUiState = MutableStateFlow(OrderStatusUiState())
    val uiState: StateFlow<OrderStatusUiState> = mutableUiState.asStateFlow()

    fun open(orderId: String, targetStatus: OrderStatus) {
        mutableUiState.value = OrderStatusUiState(
            loading = true,
            orderId = orderId,
            targetStatus = targetStatus,
            connection = networkMonitor.connection.value,
        )
        viewModelScope.launch {
            when (val result = detailRepository.load(orderId)) {
                is OrderReadResult.Success -> mutableUiState.update {
                    it.copy(
                        loading = false,
                        detail = result.value.order,
                        canSubmit = BusinessCapability.ADVANCE_ORDER_STATUS in result.value.capabilities &&
                            networkMonitor.connection.value == ConnectionState.Online,
                    )
                }
                is OrderReadResult.Failure -> mutableUiState.update {
                    it.copy(loading = false, message = "无法加载工单状态信息")
                }
            }
        }
    }

    fun submit() {
        val state = mutableUiState.value
        val target = state.targetStatus ?: return
        val detail = state.detail ?: return
        if (state.submitState == StatusSubmitState.SUBMITTING || !state.canSubmit) return
        val operationId = state.operationId ?: operationIdFactory()
        mutableUiState.update { it.copy(submitState = StatusSubmitState.SUBMITTING, operationId = operationId, message = null) }
        viewModelScope.launch {
            handle(repository.change(state.orderId, OrderStatusCommand(operationId, detail.summary.version, target)))
        }
    }

    fun confirmUnknownResult() {
        val operationId = mutableUiState.value.operationId ?: return
        if (mutableUiState.value.submitState != StatusSubmitState.CONFIRMING ||
            networkMonitor.connection.value != ConnectionState.Online
        ) return
        mutableUiState.update { it.copy(submitState = StatusSubmitState.SUBMITTING, message = null) }
        viewModelScope.launch { handle(repository.confirm(operationId)) }
    }

    fun restorePending(orderId: String, onResolved: () -> Unit = {}) {
        viewModelScope.launch {
            when (val recovery = repository.restorePending(orderId)?.result) {
                is OrderCommandResult.Success -> onResolved()
                else -> Unit
            }
        }
    }

    private fun handle(result: OrderCommandResult<OrderDetail>) {
        when (result) {
            is OrderCommandResult.Success -> mutableUiState.update {
                it.copy(submitState = StatusSubmitState.IDLE, completedOrderId = result.value.summary.id, detail = result.value, operationId = null)
            }
            is OrderCommandResult.UnknownResult -> mutableUiState.update {
                it.copy(submitState = StatusSubmitState.CONFIRMING, operationId = result.operationId)
            }
            is OrderCommandResult.Conflict -> mutableUiState.update {
                it.copy(submitState = StatusSubmitState.IDLE, detail = result.latest ?: it.detail, message = "工单已被更新，请返回详情后重试")
            }
            else -> mutableUiState.update {
                it.copy(submitState = StatusSubmitState.IDLE, message = "状态更新未完成，请稍后重试")
            }
        }
    }
}
