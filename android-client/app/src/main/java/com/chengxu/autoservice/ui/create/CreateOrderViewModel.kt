package com.chengxu.autoservice.ui.create

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderCreationRepository
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreationForm
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.toCreateCommand
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.Flow
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
import java.time.LocalDate
import java.util.UUID

class CreateOrderViewModel(
    private val repository: OrderCreationRepository,
    private val networkMonitor: NetworkMonitor,
    private val operationIdFactory: () -> String = { UUID.randomUUID().toString() },
    private val nowMillis: () -> Long = System::currentTimeMillis,
    private val draftDebounceMillis: Long = 500L,
    private val json: Json = Json { ignoreUnknownKeys = true },
) : ViewModel() {
    private val mutableUiState = MutableStateFlow(CreateOrderUiState())
    private val eventChannel = Channel<CreateOrderEvent>(Channel.BUFFERED)
    private var draftSaveJob: Job? = null
    private var draftRestored = false
    private var operationId = ""

    val uiState: StateFlow<CreateOrderUiState> = mutableUiState.asStateFlow()
    val events: Flow<CreateOrderEvent> = eventChannel.receiveAsFlow()

    init {
        viewModelScope.launch {
            networkMonitor.connection.collectLatest { connection ->
                mutableUiState.update { it.copy(connection = connection) }
                if (mutableUiState.value.metadata == null) loadMetadata()
            }
        }
        viewModelScope.launch {
            repository.observeDraft().collect { draft ->
                if (!draftRestored && draft != null) {
                    restoreDraft(draft.payloadJson)
                    draftRestored = true
                }
            }
        }
    }

    fun update(field: CreateOrderField, value: String) {
        mutableUiState.update { current ->
            current.copy(
                fields = current.fields.with(field, value),
                fieldErrors = current.fieldErrors - field,
                dirty = true,
                message = null,
            )
        }
        scheduleDraftSave()
    }

    fun next() {
        val current = mutableUiState.value
        val errors = validateStep(current.step, current)
        if (errors.isNotEmpty()) {
            mutableUiState.update { it.copy(fieldErrors = it.fieldErrors + errors, message = "请检查标记的必填项") }
            return
        }
        val nextStep = CreateOrderStep.entries.getOrElse(current.step.ordinal + 1) { current.step }
        mutableUiState.update { it.copy(step = nextStep, fieldErrors = emptyMap(), dirty = true, message = null) }
        flushDraft()
    }

    fun back() {
        val current = mutableUiState.value
        val previous = CreateOrderStep.entries.getOrElse(current.step.ordinal - 1) { current.step }
        mutableUiState.update { it.copy(step = previous, fieldErrors = emptyMap(), dirty = true, message = null) }
        flushDraft()
    }

    fun submit() {
        val current = mutableUiState.value
        if (current.submitting) return
        if (current.connection != ConnectionState.Online) {
            mutableUiState.update { it.copy(message = "网络不可用，联网后才能提交") }
            return
        }
        if (!current.canCreate) {
            mutableUiState.update { it.copy(message = "当前账号或企业未启用新增工单权限") }
            return
        }
        val errors = validateAll(current)
        if (errors.isNotEmpty()) {
            mutableUiState.update { it.copy(fieldErrors = errors, message = "请检查标记的字段") }
            return
        }
        if (operationId.isEmpty()) operationId = operationIdFactory()
        val built = current.fields.toForm().toCreateCommand(operationId)
        if (built is OrderCommandResult.ValidationFailure) {
            mutableUiState.update { it.copy(fieldErrors = mapErrors(built.fieldErrors), message = "请检查标记的字段") }
            return
        }
        val command = (built as OrderCommandResult.Success<OrderCreateCommand>).value
        mutableUiState.update { it.copy(submitting = true, message = null) }
        viewModelScope.launch {
            handleResult(repository.create(command))
        }
    }

    fun confirmUnknownResult() {
        val current = mutableUiState.value
        val unknown = current.unknownOperationId ?: return
        if (current.submitting) return
        if (current.connection != ConnectionState.Online) {
            mutableUiState.update { it.copy(message = "网络不可用，联网后再确认提交结果") }
            return
        }
        mutableUiState.update { it.copy(submitting = true, message = null) }
        viewModelScope.launch { handleResult(repository.confirm(unknown)) }
    }

    fun requestExit() {
        if (mutableUiState.value.dirty) {
            mutableUiState.update { it.copy(showLeaveConfirmation = true) }
        } else {
            viewModelScope.launch { eventChannel.send(CreateOrderEvent.Exit) }
        }
    }

    fun saveDraft() {
        draftSaveJob?.cancel()
        draftSaveJob = viewModelScope.launch {
            val saved = saveDraftNow()
            mutableUiState.update {
                it.copy(message = if (saved) "草稿已加密保存在本机" else "当前没有可保存的草稿")
            }
        }
    }

    fun flushDraft() {
        draftSaveJob?.cancel()
        draftSaveJob = viewModelScope.launch { saveDraftNow() }
    }

    fun continueEditing() {
        mutableUiState.update { it.copy(showLeaveConfirmation = false) }
    }

    fun saveAndExit() {
        draftSaveJob?.cancel()
        viewModelScope.launch {
            saveDraftNow()
            mutableUiState.update { it.copy(showLeaveConfirmation = false) }
            eventChannel.send(CreateOrderEvent.Exit)
        }
    }

    fun discardAndExit() {
        draftSaveJob?.cancel()
        viewModelScope.launch {
            repository.discardDraft()
            mutableUiState.update { it.copy(showLeaveConfirmation = false, dirty = false) }
            eventChannel.send(CreateOrderEvent.Exit)
        }
    }

    private suspend fun loadMetadata() {
        when (val result = repository.loadMetadata()) {
            is OrderCommandResult.Success -> mutableUiState.update { current ->
                current.copy(
                    loading = false,
                    metadata = result.value.metadata,
                    canCreate = result.value.canCreate,
                    fields = current.fields.withDefaults(result.value.metadata),
                    message = null,
                )
            }
            else -> mutableUiState.update {
                it.copy(loading = false, canCreate = false, message = result.message())
            }
        }
    }

    private suspend fun handleResult(result: OrderCommandResult<com.chengxu.autoservice.core.orders.model.OrderDetail>) {
        when (result) {
            is OrderCommandResult.Success -> {
                draftSaveJob?.cancel()
                operationId = ""
                mutableUiState.update { current ->
                    val resetFields = current.metadata
                        ?.let { CreateOrderFields().withDefaults(it) }
                        ?: CreateOrderFields()
                    current.copy(
                        step = CreateOrderStep.CUSTOMER,
                        fields = resetFields,
                        fieldErrors = emptyMap(),
                        submitting = false,
                        dirty = false,
                        unknownOperationId = null,
                        message = null,
                        showLeaveConfirmation = false,
                    )
                }
                eventChannel.send(CreateOrderEvent.Created(result.value.summary.id))
            }
            is OrderCommandResult.ValidationFailure -> mutableUiState.update {
                it.copy(submitting = false, fieldErrors = mapErrors(result.fieldErrors), message = "请检查标记的字段")
            }
            OrderCommandResult.Forbidden -> mutableUiState.update {
                it.copy(
                    submitting = false,
                    canCreate = false,
                    message = "当前账号或企业未启用新增工单权限",
                )
            }
            is OrderCommandResult.UnknownResult -> transitionToUnknownResult(result.operationId)
            OrderCommandResult.NetworkUnavailable,
            OrderCommandResult.ServerFailure,
            OrderCommandResult.MalformedResponse -> transitionToUnknownResult(operationId)
            else -> mutableUiState.update { it.copy(submitting = false, message = result.message()) }
        }
    }

    private suspend fun transitionToUnknownResult(id: String) {
        if (id.isBlank()) {
            mutableUiState.update { it.copy(submitting = false, message = "暂时无法确认提交结果") }
            return
        }
        operationId = id
        mutableUiState.update {
            it.copy(
                submitting = false,
                unknownOperationId = id,
                message = "提交结果正在确认，请勿重复新增",
            )
        }
        saveDraftNow()
    }

    private fun scheduleDraftSave() {
        draftSaveJob?.cancel()
        draftSaveJob = viewModelScope.launch {
            delay(draftDebounceMillis)
            saveDraftNow()
        }
    }

    private suspend fun saveDraftNow(): Boolean {
        val current = mutableUiState.value
        if (!current.dirty) return false
        return repository.saveDraft(current.toDraftJson(operationId), nowMillis())
    }

    private fun restoreDraft(payload: String) {
        try {
            val root = json.parseToJsonElement(payload).jsonObject
            val restoredStep = (root["step"] as? JsonPrimitive)?.intOrNull
                ?.coerceIn(0, CreateOrderStep.entries.lastIndex) ?: 0
            val values = root["fields"] as? JsonObject ?: return
            var fields = mutableUiState.value.fields
            for (field in CreateOrderField.entries) {
                val value = (values[field.wireName] as? JsonPrimitive)?.takeIf { it.isString }?.content
                if (value != null) fields = fields.with(field, value)
            }
            operationId = (root["operationId"] as? JsonPrimitive)
                ?.takeIf { it.isString }
                ?.content
                ?.trim()
                .orEmpty()
            mutableUiState.update {
                it.copy(
                    step = CreateOrderStep.entries[restoredStep],
                    fields = fields,
                    dirty = true,
                    unknownOperationId = operationId.ifBlank { null },
                    message = if (operationId.isNotBlank()) "提交结果正在确认，请勿重复新增" else it.message,
                )
            }
        } catch (_: Exception) {
            // The encrypted store removes damaged ciphertext; malformed legacy JSON is ignored.
        }
    }
}

private fun CreateOrderUiState.toDraftJson(operationId: String): String = buildJsonObject {
    put("step", step.ordinal)
    put("operationId", operationId)
    put("fields", buildJsonObject {
        for (field in CreateOrderField.entries) put(field.wireName, fields.value(field))
    })
}.toString()

private fun CreateOrderFields.withDefaults(metadata: OrderCreationMetadata): CreateOrderFields = copy(
    staff = staff.ifBlank { metadata.defaults.staff },
    insurer = insurer.ifBlank { metadata.defaults.insurer },
    type = type.ifBlank { metadata.defaults.type },
    accidentType = accidentType.ifBlank { metadata.defaults.accidentType },
    delivery = delivery.ifBlank { metadata.defaults.delivery },
    labor = labor.ifBlank { centsText(metadata.defaults.laborCents) },
    material = material.ifBlank { centsText(metadata.defaults.materialCents) },
    remark = remark.ifBlank { metadata.defaults.remark },
)

private fun centsText(value: Long): String =
    if (value % 100L == 0L) (value / 100L).toString() else "${value / 100L}.${(value % 100L).toString().padStart(2, '0')}"

private fun CreateOrderFields.toForm() = OrderCreationForm(
    customer, phone, plate, car, vin, staff, insuranceExpiry, insurer, type,
    accidentType, claimNo, record, labor, material, delivery, remark,
)

private fun validateAll(state: CreateOrderUiState): Map<CreateOrderField, String> =
    CreateOrderStep.entries.flatMap { validateStep(it, state).entries }.associate { it.toPair() }

private fun validateStep(
    step: CreateOrderStep,
    state: CreateOrderUiState,
): Map<CreateOrderField, String> {
    val metadata = state.metadata ?: return emptyMap()
    val fields = stepFields.getValue(step)
    val errors = mutableMapOf<CreateOrderField, String>()
    for (field in fields) {
        if (field.wireName in metadata.requiredFields && state.fields.value(field).isBlank()) {
            errors[field] = "order.${field.wireName}.required"
        }
        val max = metadata.maxLengths[field.wireName]
        if (max != null && state.fields.value(field).trim().length > max) {
            errors[field] = "order.${field.wireName}.too_long"
        }
    }
    if (step == CreateOrderStep.INSURANCE && state.fields.insuranceExpiry.isNotBlank()) {
        if (runCatching { LocalDate.parse(state.fields.insuranceExpiry) }.isFailure) {
            errors[CreateOrderField.INSURANCE_EXPIRY] = "order.insuranceExpiry.invalid_date"
        }
    }
    if (step == CreateOrderStep.REPAIR) {
        val money = state.fields.toForm().toCreateCommand("validation")
        if (money is OrderCommandResult.ValidationFailure) errors.putAll(mapErrors(money.fieldErrors))
    }
    return errors
}

private fun mapErrors(errors: Map<String, String>): Map<CreateOrderField, String> =
    errors.mapNotNull { (field, error) -> CreateOrderField.fromWire(field)?.let { it to error } }.toMap()

private fun OrderCommandResult<*>.message(): String = when (this) {
    OrderCommandResult.NetworkUnavailable -> "网络不可用，联网后才能提交"
    OrderCommandResult.Unauthorized -> "登录已过期，请重新登录"
    OrderCommandResult.Forbidden -> "当前账号或企业未启用新增工单权限"
    OrderCommandResult.ServerFailure -> "服务器暂时不可用，请稍后重试"
    OrderCommandResult.MalformedResponse -> "服务器返回异常，请稍后重试"
    is OrderCommandResult.Conflict -> "操作冲突，请刷新后重试"
    else -> null
} ?: "暂时无法完成操作，请稍后重试"
