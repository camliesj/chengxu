package com.chengxu.autoservice.ui.settlement

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderDetailRepository
import com.chengxu.autoservice.core.orders.OrderReadResult
import com.chengxu.autoservice.core.orders.OrderReceiptApi
import com.chengxu.autoservice.core.orders.OrderSettlementRepository
import com.chengxu.autoservice.core.orders.ReceiptOperationResult
import com.chengxu.autoservice.core.orders.ReceiptUpload
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.model.ReceiptReference
import com.chengxu.autoservice.core.orders.model.SettlementCommand
import com.chengxu.autoservice.core.session.SessionRepository
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SelectedReceipt(val name: String, val contentType: String, val bytes: ByteArray)
data class SettlementUiState(
    val loading: Boolean = false, val orderId: String = "", val reversing: Boolean = false,
    val detail: OrderDetail? = null, val capabilities: Set<BusinessCapability> = emptySet(),
    val receipt: SelectedReceipt? = null, val paymentMethod: String = "现金",
    val settlementDate: String = LocalDate.now().toString(), val settlementTime: String = LocalTime.now().withSecond(0).withNano(0).toString(),
    val remark: String = "", val submitting: Boolean = false, val confirmReverse: Boolean = false, val message: String? = null,
) {
    val canSettle get() = detail?.summary?.status?.let(OrderStatus::fromWire) == OrderStatus.PENDING_SETTLEMENT && capabilities.containsAll(setOf(BusinessCapability.SETTLE_ORDER, BusinessCapability.MAINTAIN_RECEIPT))
    val canReverse get() = detail?.summary?.status?.let(OrderStatus::fromWire) == OrderStatus.SETTLED && BusinessCapability.REVERSE_SETTLEMENT in capabilities
}

class SettlementViewModel(
    private val detailRepository: OrderDetailRepository, private val settlementRepository: OrderSettlementRepository,
    private val receiptApi: OrderReceiptApi, private val sessions: SessionRepository, private val network: NetworkMonitor,
) : ViewModel() {
    private val mutable = MutableStateFlow(SettlementUiState())
    val uiState: StateFlow<SettlementUiState> = mutable.asStateFlow()
    fun open(orderId: String, reversing: Boolean) { mutable.value = SettlementUiState(loading = true, orderId = orderId, reversing = reversing); viewModelScope.launch { load(orderId) } }
    fun selectReceipt(receipt: SelectedReceipt) { mutable.update { it.copy(receipt = receipt, message = null) } }
    fun updatePayment(value: String) { mutable.update { it.copy(paymentMethod = value) } }
    fun updateDate(value: String) { mutable.update { it.copy(settlementDate = value) } }
    fun updateTime(value: String) { mutable.update { it.copy(settlementTime = value) } }
    fun updateRemark(value: String) { mutable.update { it.copy(remark = value) } }
    fun requestReverse() { mutable.update { it.copy(confirmReverse = true) } }
    fun dismissReverse() { mutable.update { it.copy(confirmReverse = false) } }
    fun submit() { val state = mutable.value; if (state.reversing) { requestReverse(); return }; if (!state.canSettle) { message("当前工单不可结算"); return }; if (state.receipt == null) { message("请先选择到账回执截图"); return }; viewModelScope.launch { settle(state) } }
    fun confirmReverse() { val state = mutable.value; if (!state.canReverse) { message("当前工单不可返结算"); return }; viewModelScope.launch { mutable.update { it.copy(confirmReverse = false, submitting = true) }; handle(settlementRepository.reverse(state.orderId, UUID.randomUUID().toString(), state.detail!!.summary.version)) } }
    private suspend fun settle(state: SettlementUiState) {
        val session = sessions.session.value ?: run { message("登录已失效"); return }
        if (network.connection.value != ConnectionState.Online) { message("网络不可用，当前为只读模式"); return }
        mutable.update { it.copy(submitting = true) }
        val selected = state.receipt!!
        when (val uploaded = receiptApi.upload(session.token, state.orderId, ReceiptUpload(selected.name, selected.contentType, selected.bytes))) {
            is ReceiptOperationResult.Success -> handle(settlementRepository.settle(state.orderId, SettlementCommand(UUID.randomUUID().toString(), state.detail!!.summary.version, state.paymentMethod, state.settlementDate, state.settlementTime, state.remark, uploaded.value)))
            else -> message("回执上传失败，请检查图片和权限")
        }
    }
    private suspend fun load(orderId: String) { when (val result = detailRepository.load(orderId)) { is OrderReadResult.Success -> mutable.update { it.copy(loading = false, detail = result.value.order, capabilities = result.value.capabilities) }; else -> message("无法加载工单详情") } }
    private fun handle(result: OrderCommandResult<OrderDetail>) { when (result) { is OrderCommandResult.Success -> mutable.update { it.copy(submitting = false, detail = result.value, receipt = null, message = "操作成功") }; is OrderCommandResult.Conflict -> mutable.update { it.copy(submitting = false, detail = result.latest ?: it.detail, message = "工单已更新，请核对最新数据") }; else -> message("操作未完成，请稍后重试") } }
    private fun message(text: String) { mutable.update { it.copy(loading = false, submitting = false, message = text) } }
}
