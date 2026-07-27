package com.chengxu.autoservice.ui.edit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderEditRepository
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreationForm
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.toEditCommand
import com.chengxu.autoservice.ui.create.CreateOrderField
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class EditOrderViewModel(
    private val repository: OrderEditRepository,
    private val networkMonitor: NetworkMonitor,
    private val operationIdFactory: () -> String,
) : ViewModel() {
    private val mutableUiState = MutableStateFlow(EditOrderUiState())
    private val eventChannel = Channel<EditOrderEvent>(Channel.BUFFERED)
    val uiState: StateFlow<EditOrderUiState> = mutableUiState.asStateFlow()
    val events: Flow<EditOrderEvent> = eventChannel.receiveAsFlow()

    init { viewModelScope.launch { networkMonitor.connection.collectLatest { connection -> mutableUiState.update { it.copy(connection = connection) } } } }

    fun open(orderId: String) {
        mutableUiState.value = EditOrderUiState(loading = true, orderId = orderId, connection = networkMonitor.connection.value)
        viewModelScope.launch {
            when (val result = repository.loadEditor(orderId)) {
                is OrderCommandResult.Success -> mutableUiState.update {
                    it.copy(loading = false, fields = result.value.detail.toFields(), metadata = result.value.metadata,
                        expectedVersion = result.value.detail.summary.version, canEdit = BusinessCapability.EDIT_ORDER in result.value.capabilities)
                }
                else -> mutableUiState.update { it.copy(loading = false, message = "无法加载工单编辑信息") }
            }
        }
    }

    fun update(field: EditOrderField, value: String) = mutableUiState.update { current ->
        current.copy(fields = current.fields.with(field, value), dirty = true, message = null)
    }

    fun submit() {
        val state = mutableUiState.value
        if (state.submitState == EditSubmitState.SUBMITTING || state.orderId.isBlank()) return
        if (state.connection != ConnectionState.Online || !state.canEdit) {
            mutableUiState.update { it.copy(message = "当前状态不可提交编辑") }; return
        }
        val operationId = state.operationId ?: operationIdFactory()
        val built = state.fields.toForm().toEditCommand(operationId, state.expectedVersion)
        if (built !is OrderCommandResult.Success) { mutableUiState.update { it.copy(message = "请检查编辑字段") }; return }
        mutableUiState.update { it.copy(submitState = EditSubmitState.SUBMITTING, operationId = operationId, message = null) }
        viewModelScope.launch { handle(repository.edit(state.orderId, built.value)) }
    }

    fun confirmUnknownResult() {
        val operationId = mutableUiState.value.operationId ?: return
        if (mutableUiState.value.connection != ConnectionState.Online) return
        mutableUiState.update { it.copy(submitState = EditSubmitState.SUBMITTING) }
        viewModelScope.launch { handle(repository.confirm(operationId)) }
    }

    fun rebaseOnLatest() {
        val latest = mutableUiState.value.latest ?: return
        mutableUiState.update { it.copy(expectedVersion = latest.summary.version, submitState = EditSubmitState.IDLE, operationId = null, latest = null, conflictingFields = emptySet()) }
    }

    private suspend fun handle(result: OrderCommandResult<OrderDetail>) = when (result) {
        is OrderCommandResult.Success -> { repository.deleteDraft(result.value.summary.id); mutableUiState.update { it.copy(submitState = EditSubmitState.IDLE, dirty = false, operationId = null) }; eventChannel.send(EditOrderEvent.Saved(result.value.summary.id)) }
        is OrderCommandResult.UnknownResult -> mutableUiState.update { it.copy(submitState = EditSubmitState.CONFIRMING, operationId = result.operationId) }
        is OrderCommandResult.Conflict -> mutableUiState.update { it.copy(submitState = EditSubmitState.CONFLICT, latest = result.latest, conflictingFields = result.conflictingFields) }
        else -> mutableUiState.update { it.copy(submitState = EditSubmitState.IDLE, message = "编辑未完成，请稍后重试") }
    }
}

private fun EditOrderFields.toForm() = OrderCreationForm(customer, phone, plate, car, vin, staff, insuranceExpiry, insurer, type, accidentType, claimNo, record, labor, material, delivery, remark)
private fun OrderDetail.toFields() = EditOrderFields(customer = summary.customer, phone = phone, plate = summary.plate, car = summary.car, vin = vin, staff = staff, insuranceExpiry = summary.insuranceExpiry, insurer = insurer, type = summary.type, accidentType = accidentType, claimNo = claimNo, record = summary.record, labor = cents(laborCents), material = cents(materialCents), delivery = summary.delivery, remark = remark)
private fun cents(value: Long) = if (value % 100L == 0L) (value / 100L).toString() else "${value / 100L}.${(value % 100L).toString().padStart(2, '0')}"
