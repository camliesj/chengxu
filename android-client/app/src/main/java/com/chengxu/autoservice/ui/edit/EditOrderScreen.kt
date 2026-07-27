package com.chengxu.autoservice.ui.edit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoservicePanelShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.ui.create.CreateOptionField
import com.chengxu.autoservice.ui.create.CreateOrderUiState
import com.chengxu.autoservice.ui.create.CreateProgress
import com.chengxu.autoservice.ui.create.CreateTextField

object EditOrderTestTags {
    const val EDIT_ORDER = "edit_order"
    const val SAVE_DRAFT = "save_edit_draft"
    const val SUBMIT = "submit_edit"
    const val CONFIRM = "confirm_edit_result"
    const val RETURN = "return_to_detail"
    const val REBASE = "rebase_edit"
    const val BACK = "edit_order_back"
    const val NEXT = "edit_order_next"
}

@Composable
fun EditOrderScreen(
    state: EditOrderUiState,
    onUpdate: (EditOrderField, String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onSubmit: () -> Unit,
    onConfirm: () -> Unit,
    onSaveDraft: () -> Unit,
    onReturn: () -> Unit,
    onRebase: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize().imePadding()) {
        EditHeader(state)
        CreateProgress(current = state.step)
        if (state.connection == ConnectionState.Offline) {
            Text(
                text = "离线时可以保存草稿，联网后才能提交",
                modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Sm),
                color = AutoserviceColors.Warning,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
            )
        }
        Box(modifier = Modifier.weight(1f)) {
            when {
                state.loading -> LoadingContent()
                state.submitState == EditSubmitState.CONFLICT -> ConflictContent(state, onReturn, onRebase)
                else -> EditFormContent(state, onUpdate)
            }
        }
        if (!state.loading && state.submitState != EditSubmitState.CONFLICT) {
            EditFooter(state, onBack, onNext, onSubmit, onConfirm, onSaveDraft)
        }
    }
}

@Composable
private fun EditHeader(state: EditOrderUiState) {
    Column(modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Lg)) {
        Text("编辑维修工单", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            "第 ${state.step.ordinal + 1} / ${EditOrderStep.entries.size} 步 · 工单 ${state.orderId}",
            style = MaterialTheme.typography.bodySmall,
            color = AutoserviceColors.InkMuted,
        )
    }
}

@Composable
private fun LoadingContent() {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator(color = AutoserviceColors.Action)
        Text("正在加载工单信息", modifier = Modifier.padding(top = AutoserviceSpacing.Md))
    }
}

@Composable
private fun EditFormContent(
    state: EditOrderUiState,
    onUpdate: (EditOrderField, String) -> Unit,
) {
    val createState = state.asCreateState()
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(AutoserviceSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        item {
            Text(state.step.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        when (state.step) {
            EditOrderStep.CUSTOMER -> customerFields(createState, onUpdate)
            EditOrderStep.INSURANCE -> insuranceFields(createState, onUpdate)
            EditOrderStep.REPAIR -> repairFields(createState, onUpdate)
            EditOrderStep.CONFIRM -> confirmationFields(state)
        }
        state.message?.let { message ->
            item {
                Surface(shape = AutoservicePanelShape, color = AutoserviceColors.SurfaceSoft) {
                    Text(message, modifier = Modifier.padding(AutoserviceSpacing.Md), color = AutoserviceColors.Ink)
                }
            }
        }
    }
}

private fun LazyListScope.customerFields(
    state: CreateOrderUiState,
    onUpdate: (EditOrderField, String) -> Unit,
) {
    item { CreateTextField(state, EditOrderField.CUSTOMER, "客户姓名 *", onUpdate) }
    item { CreateTextField(state, EditOrderField.PHONE, "手机号 *", onUpdate) }
    item { CreateTextField(state, EditOrderField.PLATE, "车牌号 *", onUpdate) }
    item { CreateTextField(state, EditOrderField.CAR, "车型 *", onUpdate) }
    item { CreateTextField(state, EditOrderField.VIN, "VIN / 车架号", onUpdate) }
    item {
        CreateOptionField(
            state, EditOrderField.STAFF, "负责人",
            state.metadata?.options?.staff?.map { it.name }.orEmpty(), onUpdate,
        )
    }
}

private fun LazyListScope.insuranceFields(
    state: CreateOrderUiState,
    onUpdate: (EditOrderField, String) -> Unit,
) {
    item { CreateTextField(state, EditOrderField.INSURANCE_EXPIRY, "保险到期日 *（YYYY-MM-DD）", onUpdate) }
    item { CreateOptionField(state, EditOrderField.INSURER, "保险公司", state.metadata?.options?.insurers.orEmpty(), onUpdate) }
    item { CreateOptionField(state, EditOrderField.TYPE, "车辆类型", state.metadata?.options?.vehicleTypes.orEmpty(), onUpdate) }
    item { CreateOptionField(state, EditOrderField.ACCIDENT_TYPE, "事故类型", state.metadata?.options?.accidentTypes.orEmpty(), onUpdate) }
    item { CreateTextField(state, EditOrderField.CLAIM_NO, "保险案件号", onUpdate) }
}

private fun LazyListScope.repairFields(
    state: CreateOrderUiState,
    onUpdate: (EditOrderField, String) -> Unit,
) {
    item { CreateTextField(state, EditOrderField.RECORD, "维修项目 *", onUpdate, multiline = true) }
    item { CreateTextField(state, EditOrderField.LABOR, "工时费", onUpdate) }
    item { CreateTextField(state, EditOrderField.MATERIAL, "材料费", onUpdate) }
    item {
        CreateOptionField(
            state, EditOrderField.DELIVERY, "预计交车",
            state.metadata?.options?.deliverySuggestions.orEmpty(), onUpdate, allowCustomInput = true,
        )
    }
    item { CreateTextField(state, EditOrderField.REMARK, "接待备注", onUpdate, multiline = true) }
}

private fun LazyListScope.confirmationFields(state: EditOrderUiState) {
    val rows = listOf(
        "客户" to state.fields.customer,
        "联系电话" to state.fields.phone,
        "车辆" to "${state.fields.plate} · ${state.fields.car}",
        "负责人" to state.fields.staff.ifBlank { "待分配" },
        "保险" to "${state.fields.insurer} · ${state.fields.insuranceExpiry}",
        "维修项目" to state.fields.record,
        "预计交车" to state.fields.delivery.ifBlank { "待确认" },
    )
    items(rows.size) { index ->
        val (label, value) = rows[index]
        Surface(shape = AutoservicePanelShape, color = AutoserviceColors.Surface) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Md),
                horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
            ) {
                Text(label, modifier = Modifier.weight(0.35f), color = AutoserviceColors.InkMuted)
                Text(value, modifier = Modifier.weight(0.65f), color = AutoserviceColors.Ink, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun EditFooter(
    state: EditOrderUiState,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onSubmit: () -> Unit,
    onConfirm: () -> Unit,
    onSaveDraft: () -> Unit,
) {
    Surface(color = AutoserviceColors.Surface, shadowElevation = 8.dp) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        ) {
            BrandButton(
                onClick = onBack,
                modifier = Modifier.weight(1f).testTag(EditOrderTestTags.BACK),
                tone = BrandButtonTone.SECONDARY,
                enabled = state.step != EditOrderStep.CUSTOMER && state.submitState != EditSubmitState.SUBMITTING,
            ) { Text("上一步") }
            BrandButton(
                onClick = onSaveDraft,
                modifier = Modifier.weight(1.1f).testTag(EditOrderTestTags.SAVE_DRAFT),
                tone = BrandButtonTone.QUIET,
                enabled = state.dirty && state.submitState != EditSubmitState.SUBMITTING,
            ) { Text("保存草稿") }
            val isConfirming = state.submitState == EditSubmitState.CONFIRMING
            val isFinalStep = state.step == EditOrderStep.CONFIRM
            BrandButton(
                onClick = when {
                    isConfirming -> onConfirm
                    isFinalStep -> onSubmit
                    else -> onNext
                },
                modifier = Modifier.weight(1.5f).testTag(
                    when {
                        isConfirming -> EditOrderTestTags.CONFIRM
                        isFinalStep -> EditOrderTestTags.SUBMIT
                        else -> EditOrderTestTags.NEXT
                    },
                ),
                enabled = when {
                    state.submitState == EditSubmitState.SUBMITTING -> false
                    isConfirming -> state.connection == ConnectionState.Online
                    isFinalStep -> state.connection == ConnectionState.Online && state.canEdit
                    else -> true
                },
                loading = state.submitState == EditSubmitState.SUBMITTING,
            ) {
                Text(
                    when {
                        isConfirming -> "确认提交结果"
                        isFinalStep -> "确认并保存"
                        else -> "下一步"
                    },
                )
            }
        }
    }
}

@Composable
private fun ConflictContent(state: EditOrderUiState, onReturn: () -> Unit, onRebase: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(AutoserviceSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        Text("工单已被其他人更新", style = MaterialTheme.typography.headlineSmall, color = AutoserviceColors.Danger)
        Text("请比较服务端与本地内容；继续编辑会以服务端最新版本为基础。", color = AutoserviceColors.InkMuted)
        state.conflictingFields.forEach { field ->
            Surface(shape = AutoservicePanelShape, color = AutoserviceColors.SurfaceSoft) {
                Column(modifier = Modifier.padding(AutoserviceSpacing.Md)) {
                    Text(field, fontWeight = FontWeight.SemiBold)
                    Text("服务端：${state.latest?.valueFor(field).orEmpty()}")
                    Text("本地：${state.fields.valueFor(field)}")
                }
            }
        }
        BrandButton(onClick = onReturn, modifier = Modifier.fillMaxWidth().testTag(EditOrderTestTags.RETURN), tone = BrandButtonTone.SECONDARY) {
            Text("返回最新详情")
        }
        BrandButton(onClick = onRebase, modifier = Modifier.fillMaxWidth().testTag(EditOrderTestTags.REBASE)) {
            Text("基于最新版本继续编辑")
        }
    }
}

private fun EditOrderUiState.asCreateState() = CreateOrderUiState(
    loading = loading,
    step = step,
    fields = fields,
    metadata = metadata,
    canCreate = canEdit,
    connection = connection,
    dirty = dirty,
    submitting = submitState == EditSubmitState.SUBMITTING,
)

private fun EditOrderFields.valueFor(wireName: String): String =
    EditOrderField.fromWire(wireName)?.let(::value).orEmpty()

private fun com.chengxu.autoservice.core.orders.model.OrderDetail.valueFor(wireName: String): String = when (wireName) {
    "customer" -> summary.customer
    "phone" -> phone
    "plate" -> summary.plate
    "car" -> summary.car
    "vin" -> vin
    "staff" -> staff
    "insuranceExpiry" -> summary.insuranceExpiry
    "insurer" -> insurer
    "type" -> summary.type
    "accidentType" -> accidentType
    "claimNo" -> claimNo
    "record" -> summary.record
    "laborCents" -> laborCents.toString()
    "materialCents" -> materialCents.toString()
    "delivery" -> summary.delivery
    "remark" -> remark
    else -> ""
}
