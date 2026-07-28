package com.chengxu.autoservice.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.orders.OrderDetailRepository
import com.chengxu.autoservice.core.orders.OrderReadFailure
import com.chengxu.autoservice.core.orders.OrderReadResult
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OrderDetailUiState(
    val loading: Boolean = false,
    val detail: OrderDetail? = null,
    val capabilities: Set<BusinessCapability> = emptySet(),
    /** Kept only for the active detail session; it is never persisted. */
    val receiptKey: String? = null,
    val closeRequested: Boolean = false,
    val message: String? = null,
) {
    val canEdit: Boolean
        get() = BusinessCapability.EDIT_ORDER in capabilities &&
            detail?.summary?.status?.let(OrderStatus::fromWire) != OrderStatus.SETTLED
}

class OrderDetailViewModel(private val repository: OrderDetailRepository) : ViewModel() {
    private val mutableUiState = MutableStateFlow(OrderDetailUiState())
    val uiState: StateFlow<OrderDetailUiState> = mutableUiState.asStateFlow()

    fun open(orderId: String) {
        mutableUiState.value = OrderDetailUiState(loading = true)
        viewModelScope.launch {
            when (val result = repository.load(orderId)) {
                is OrderReadResult.Success -> mutableUiState.update {
                    it.copy(
                        loading = false,
                        detail = result.value.order,
                        capabilities = result.value.capabilities,
                        receiptKey = result.value.receiptKey,
                    )
                }
                is OrderReadResult.Failure -> mutableUiState.update {
                    it.copy(loading = false, closeRequested = result.reason == OrderReadFailure.NotFound, message = "无法加载工单详情")
                }
            }
        }
    }
}
