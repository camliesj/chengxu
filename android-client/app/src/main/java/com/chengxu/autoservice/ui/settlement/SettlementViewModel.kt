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
data class ReceiptPreview(val contentType: String, val bytes: ByteArray)

data class SettlementUiState(
    val loading: Boolean = false,
    val orderId: String = "",
    val reversing: Boolean = false,
    val detail: OrderDetail? = null,
    val capabilities: Set<BusinessCapability> = emptySet(),
    /** Object key from the active privileged detail response; never placed in a cache. */
    val receiptKey: String? = null,
    val receipt: SelectedReceipt? = null,
    val receiptPreview: ReceiptPreview? = null,
    val paymentMethod: String = "现金",
    val settlementDate: String = LocalDate.now().toString(),
    val settlementTime: String = LocalTime.now().withSecond(0).withNano(0).toString(),
    val remark: String = "",
    val submitting: Boolean = false,
    val confirmReverse: Boolean = false,
    val confirmDelete: Boolean = false,
    val message: String? = null,
) {
    private val status get() = detail?.summary?.status?.let(OrderStatus::fromWire)
    val canSettle get() = status == OrderStatus.PENDING_SETTLEMENT && capabilities.containsAll(setOf(BusinessCapability.SETTLE_ORDER, BusinessCapability.MAINTAIN_RECEIPT))
    val canReverse get() = status == OrderStatus.SETTLED && BusinessCapability.REVERSE_SETTLEMENT in capabilities
    val canManageReceipt get() = status == OrderStatus.SETTLED && detail?.receipt != null && !receiptKey.isNullOrBlank() && BusinessCapability.MAINTAIN_RECEIPT in capabilities
    val isReceiptManagement get() = !reversing && status == OrderStatus.SETTLED
}

class SettlementViewModel(
    private val detailRepository: OrderDetailRepository,
    private val settlementRepository: OrderSettlementRepository,
    private val receiptApi: OrderReceiptApi,
    private val sessions: SessionRepository,
    private val network: NetworkMonitor,
) : ViewModel() {
    private val mutable = MutableStateFlow(SettlementUiState())
    val uiState: StateFlow<SettlementUiState> = mutable.asStateFlow()

    fun open(orderId: String, reversing: Boolean) {
        mutable.value = SettlementUiState(loading = true, orderId = orderId, reversing = reversing)
        viewModelScope.launch { load(orderId) }
    }

    fun selectReceipt(receipt: SelectedReceipt) {
        mutable.update { it.copy(receipt = receipt, receiptPreview = null, message = null) }
    }
    fun updatePayment(value: String) = mutable.update { it.copy(paymentMethod = value) }
    fun updateDate(value: String) = mutable.update { it.copy(settlementDate = value) }
    fun updateTime(value: String) = mutable.update { it.copy(settlementTime = value) }
    fun updateRemark(value: String) = mutable.update { it.copy(remark = value) }
    fun requestReverse() = mutable.update { it.copy(confirmReverse = true) }
    fun dismissReverse() = mutable.update { it.copy(confirmReverse = false) }
    fun requestDelete() = mutable.update { it.copy(confirmDelete = true) }
    fun dismissDelete() = mutable.update { it.copy(confirmDelete = false) }

    fun submit() {
        val state = mutable.value
        when {
            state.reversing -> requestReverse()
            state.canSettle && state.receipt != null -> viewModelScope.launch { settle(state) }
            state.isReceiptManagement && state.canManageReceipt && state.receipt != null -> viewModelScope.launch { replaceReceipt(state) }
            state.isReceiptManagement -> message("当前账号没有管理到账回执的权限，或回执已不可用")
            state.canSettle -> message("请先从相册选择到账回执截图")
            else -> message("当前工单不可结算")
        }
    }

    fun viewReceipt() {
        val state = mutable.value
        val key = state.receiptKey ?: return message("到账回执不可用")
        val session = sessions.session.value ?: return message("登录已失效")
        if (network.connection.value != ConnectionState.Online) return message("网络不可用，当前为只读模式")
        viewModelScope.launch {
            mutable.update { it.copy(submitting = true, message = null) }
            when (val result = receiptApi.download(session.token, key)) {
                is ReceiptOperationResult.Success -> mutable.update {
                    it.copy(submitting = false, receiptPreview = ReceiptPreview(result.value.contentType, result.value.bytes))
                }
                else -> message("无法读取到账回执，请检查权限或网络")
            }
        }
    }

    fun confirmReverse() {
        val state = mutable.value
        if (!state.canReverse) return message("当前工单不可返结算")
        viewModelScope.launch {
            mutable.update { it.copy(confirmReverse = false, submitting = true) }
            handle(settlementRepository.reverse(state.orderId, UUID.randomUUID().toString(), state.detail!!.summary.version))
        }
    }

    fun confirmDelete() {
        val state = mutable.value
        val oldKey = state.receiptKey
        if (!state.canManageReceipt || oldKey.isNullOrBlank()) return message("到账回执不可删除")
        viewModelScope.launch {
            mutable.update { it.copy(confirmDelete = false, submitting = true) }
            when (val result = settlementRepository.updateReceipt(state.orderId, UUID.randomUUID().toString(), state.detail!!.summary.version, null)) {
                is OrderCommandResult.Success -> {
                    val deletion = sessions.session.value?.let { receiptApi.delete(it.token, oldKey, state.orderId) }
                    mutable.update {
                        it.copy(
                            submitting = false,
                            detail = result.value,
                            receipt = null,
                            receiptPreview = null,
                            receiptKey = null,
                            message = if (deletion is ReceiptOperationResult.Success) "到账回执已删除" else "回执记录已删除，原图片等待服务端清理",
                        )
                    }
                }
                else -> handle(result)
            }
        }
    }

    private suspend fun settle(state: SettlementUiState) {
        val uploaded = upload(state) ?: return
        val result = settlementRepository.settle(
            state.orderId,
            SettlementCommand(UUID.randomUUID().toString(), state.detail!!.summary.version, state.paymentMethod, state.settlementDate, state.settlementTime, state.remark, uploaded),
        )
        if (result !is OrderCommandResult.Success) cleanupUploaded(state, uploaded)
        handle(result, receiptKey = uploaded.key)
    }

    private suspend fun replaceReceipt(state: SettlementUiState) {
        val uploaded = upload(state) ?: return
        val oldKey = state.receiptKey!!
        when (val result = settlementRepository.updateReceipt(state.orderId, UUID.randomUUID().toString(), state.detail!!.summary.version, uploaded)) {
            is OrderCommandResult.Success -> {
                val deletion = sessions.session.value?.let { receiptApi.delete(it.token, oldKey, state.orderId) }
                mutable.update {
                    it.copy(
                        submitting = false,
                        detail = result.value,
                        receipt = null,
                        receiptKey = uploaded.key,
                        message = if (deletion is ReceiptOperationResult.Success) "到账回执已替换" else "到账回执已替换，原图片等待服务端清理",
                    )
                }
            }
            else -> {
                cleanupUploaded(state, uploaded)
                handle(result)
            }
        }
    }

    private suspend fun upload(state: SettlementUiState): ReceiptReference? {
        val session = sessions.session.value ?: run { message("登录已失效"); return null }
        if (network.connection.value != ConnectionState.Online) { message("网络不可用，当前为只读模式"); return null }
        val selected = state.receipt ?: run { message("请先从相册选择到账回执截图"); return null }
        mutable.update { it.copy(submitting = true, message = null) }
        return when (val uploaded = receiptApi.upload(session.token, state.orderId, ReceiptUpload(selected.name, selected.contentType, selected.bytes))) {
            is ReceiptOperationResult.Success -> uploaded.value
            else -> { message("回执上传失败，请检查图片和权限"); null }
        }
    }

    private suspend fun cleanupUploaded(state: SettlementUiState, uploaded: ReceiptReference) {
        sessions.session.value?.let { receiptApi.delete(it.token, uploaded.key, state.orderId) }
    }

    private suspend fun load(orderId: String) {
        when (val result = detailRepository.load(orderId)) {
            is OrderReadResult.Success -> mutable.update {
                it.copy(
                    loading = false,
                    detail = result.value.order,
                    capabilities = result.value.capabilities,
                    receiptKey = result.value.receiptKey,
                )
            }
            else -> message("无法加载工单详情")
        }
    }

    private fun handle(result: OrderCommandResult<OrderDetail>, receiptKey: String? = null) {
        when (result) {
            is OrderCommandResult.Success -> mutable.update {
                it.copy(submitting = false, detail = result.value, receipt = null, receiptKey = receiptKey, message = "操作成功")
            }
            is OrderCommandResult.Conflict -> mutable.update {
                it.copy(submitting = false, detail = result.latest ?: it.detail, receiptKey = null, message = "工单已更新，请核对最新数据")
            }
            else -> message("操作未完成，请稍后重试")
        }
    }

    private fun message(text: String) {
        mutable.update { it.copy(loading = false, submitting = false, message = text) }
    }
}
