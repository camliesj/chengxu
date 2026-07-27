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
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.toEditCommand
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put

class EditOrderViewModel(
    private val repository: OrderEditRepository,
    private val networkMonitor: NetworkMonitor,
    private val nowMillis: () -> Long = System::currentTimeMillis,
    private val draftDebounceMillis: Long = 500L,
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val operationIdFactory: () -> String,
) : ViewModel() {
    private val mutableUiState = MutableStateFlow(EditOrderUiState())
    private val eventChannel = Channel<EditOrderEvent>(Channel.BUFFERED)
    private var draftSaveJob: Job? = null
    private var draftObserveJob: Job? = null
    private var pendingDraft: OrderDraft? = null

    val uiState: StateFlow<EditOrderUiState> = mutableUiState.asStateFlow()
    val events: Flow<EditOrderEvent> = eventChannel.receiveAsFlow()

    init {
        viewModelScope.launch {
            networkMonitor.connection.collectLatest { connection ->
                mutableUiState.update { it.copy(connection = connection) }
            }
        }
    }

    fun open(orderId: String) {
        draftSaveJob?.cancel()
        draftObserveJob?.cancel()
        pendingDraft = null
        mutableUiState.value = EditOrderUiState(
            loading = true,
            orderId = orderId,
            connection = networkMonitor.connection.value,
        )
        draftObserveJob = viewModelScope.launch {
            repository.observeDraft(orderId).collectLatest { draft ->
                pendingDraft = draft
                if (draft != null && !mutableUiState.value.loading && mutableUiState.value.orderId == orderId) {
                    restoreDraft(draft)
                }
            }
        }
        viewModelScope.launch {
            when (val result = repository.loadEditor(orderId)) {
                is OrderCommandResult.Success -> {
                    mutableUiState.update {
                        it.copy(
                            loading = false,
                            fields = result.value.detail.toFields(),
                            metadata = result.value.metadata,
                            expectedVersion = result.value.detail.summary.version,
                            canEdit = BusinessCapability.EDIT_ORDER in result.value.capabilities,
                        )
                    }
                    pendingDraft?.let(::restoreDraft)
                }
                else -> mutableUiState.update { it.copy(loading = false, message = "无法加载工单编辑信息") }
            }
        }
    }

    fun update(field: EditOrderField, value: String) {
        mutableUiState.update { current ->
            current.copy(fields = current.fields.with(field, value), dirty = true, message = null)
        }
        scheduleDraftSave()
    }

    fun next() {
        mutableUiState.update { current ->
            val next = EditOrderStep.entries.getOrElse(current.step.ordinal + 1) { current.step }
            current.copy(step = next, message = null)
        }
        flushDraft()
    }

    fun back() {
        mutableUiState.update { current ->
            val previous = EditOrderStep.entries.getOrElse(current.step.ordinal - 1) { current.step }
            current.copy(step = previous, message = null)
        }
        flushDraft()
    }

    fun submit() {
        val state = mutableUiState.value
        if (state.submitState == EditSubmitState.SUBMITTING || state.orderId.isBlank()) return
        if (state.connection != ConnectionState.Online || !state.canEdit) {
            mutableUiState.update { it.copy(message = "当前状态不可提交编辑") }
            return
        }
        val operationId = state.operationId ?: operationIdFactory()
        val built = state.fields.toForm().toEditCommand(operationId, state.expectedVersion)
        if (built !is OrderCommandResult.Success) {
            mutableUiState.update { it.copy(message = "请检查编辑字段") }
            return
        }
        mutableUiState.update {
            it.copy(submitState = EditSubmitState.SUBMITTING, operationId = operationId, message = null)
        }
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
        mutableUiState.update {
            it.copy(
                expectedVersion = latest.summary.version,
                submitState = EditSubmitState.IDLE,
                operationId = null,
                latest = null,
                conflictingFields = emptySet(),
                dirty = true,
            )
        }
        flushDraft()
    }

    fun saveDraft() {
        draftSaveJob?.cancel()
        draftSaveJob = viewModelScope.launch {
            val saved = saveDraftNow()
            if (saved) mutableUiState.update { it.copy(message = "草稿已加密保存在本机") }
        }
    }

    fun flushDraft() {
        if (!mutableUiState.value.dirty || mutableUiState.value.orderId.isBlank()) return
        draftSaveJob?.cancel()
        draftSaveJob = viewModelScope.launch { saveDraftNow() }
    }

    fun returnToDetail() {
        val state = mutableUiState.value
        draftSaveJob?.cancel()
        viewModelScope.launch {
            if (state.submitState == EditSubmitState.CONFLICT) repository.deleteDraft(state.orderId)
            eventChannel.send(EditOrderEvent.Exit)
        }
    }

    private suspend fun handle(result: OrderCommandResult<OrderDetail>) = when (result) {
        is OrderCommandResult.Success -> {
            repository.deleteDraft(result.value.summary.id)
            mutableUiState.update {
                it.copy(submitState = EditSubmitState.IDLE, dirty = false, operationId = null)
            }
            eventChannel.send(EditOrderEvent.Saved(result.value.summary.id))
        }
        is OrderCommandResult.UnknownResult -> mutableUiState.update {
            it.copy(submitState = EditSubmitState.CONFIRMING, operationId = result.operationId)
        }
        is OrderCommandResult.Conflict -> mutableUiState.update {
            it.copy(
                submitState = EditSubmitState.CONFLICT,
                latest = result.latest,
                conflictingFields = result.conflictingFields,
            )
        }
        else -> mutableUiState.update {
            it.copy(submitState = EditSubmitState.IDLE, message = "编辑未完成，请稍后重试")
        }
    }

    private fun scheduleDraftSave() {
        draftSaveJob?.cancel()
        draftSaveJob = viewModelScope.launch {
            delay(draftDebounceMillis)
            saveDraftNow()
        }
    }

    private suspend fun saveDraftNow(): Boolean {
        val state = mutableUiState.value
        if (!state.dirty || state.orderId.isBlank()) return false
        repository.saveDraft(
            state.orderId,
            OrderDraft(
                localId = "edit:${state.orderId}",
                companyId = "",
                baseOrderId = state.orderId,
                expectedVersion = state.expectedVersion,
                payloadJson = state.toDraftJson(),
                updatedAtMillis = nowMillis(),
            ),
        )
        return true
    }

    private fun restoreDraft(draft: OrderDraft) {
        try {
            val root = json.parseToJsonElement(draft.payloadJson).jsonObject
            val values = root["fields"] as? JsonObject ?: return
            var fields = mutableUiState.value.fields
            EditOrderField.entries.forEach { field ->
                val value = (values[field.wireName] as? JsonPrimitive)
                    ?.takeIf { it.isString }
                    ?.content
                if (value != null) fields = fields.with(field, value)
            }
            val stepIndex = (root["step"] as? JsonPrimitive)?.intOrNull
                ?.coerceIn(0, EditOrderStep.entries.lastIndex) ?: 0
            val restoredOperation = (root["operationId"] as? JsonPrimitive)
                ?.takeIf { it.isString }
                ?.content
                .orEmpty()
            mutableUiState.update {
                it.copy(
                    step = EditOrderStep.entries[stepIndex],
                    fields = fields,
                    expectedVersion = draft.expectedVersion ?: it.expectedVersion,
                    operationId = restoredOperation.ifBlank { null },
                    dirty = true,
                )
            }
        } catch (_: Exception) {
            // The encrypted store removes damaged ciphertext; malformed legacy JSON is ignored.
        }
    }
}

private fun EditOrderFields.toForm() = OrderCreationForm(
    customer, phone, plate, car, vin, staff, insuranceExpiry, insurer, type,
    accidentType, claimNo, record, labor, material, delivery, remark,
)

private fun OrderDetail.toFields() = EditOrderFields(
    customer = summary.customer,
    phone = phone,
    plate = summary.plate,
    car = summary.car,
    vin = vin,
    staff = staff,
    insuranceExpiry = summary.insuranceExpiry,
    insurer = insurer,
    type = summary.type,
    accidentType = accidentType,
    claimNo = claimNo,
    record = summary.record,
    labor = cents(laborCents),
    material = cents(materialCents),
    delivery = summary.delivery,
    remark = remark,
)

private fun cents(value: Long) =
    if (value % 100L == 0L) (value / 100L).toString()
    else "${value / 100L}.${(value % 100L).toString().padStart(2, '0')}"

private fun EditOrderUiState.toDraftJson() = buildJsonObject {
    put("step", step.ordinal)
    put("operationId", operationId.orEmpty())
    put("fields", buildJsonObject {
        EditOrderField.entries.forEach { field -> put(field.wireName, fields.value(field)) }
    })
}.toString()
