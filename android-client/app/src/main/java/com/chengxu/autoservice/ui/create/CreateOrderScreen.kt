package com.chengxu.autoservice.ui.create

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.network.ConnectionState

@Composable
fun CreateOrderScreen(
    state: CreateOrderUiState,
    onUpdate: (CreateOrderField, String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onSubmit: () -> Unit,
    onConfirmUnknown: () -> Unit,
    onSaveDraft: () -> Unit,
    onExit: () -> Unit,
    onContinueEditing: () -> Unit,
    onDiscardAndExit: () -> Unit,
    onSaveAndExit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize().imePadding()) {
        CreateHeader(state.step, state.submitting, onExit)
        CreateProgress(current = state.step)
        if (state.connection == ConnectionState.Offline) {
            Text(
                text = "离线状态可继续编辑草稿，联网后才能提交",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Sm),
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.Warning,
                textAlign = TextAlign.Center,
            )
        }
        if (state.loading) {
            Column(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator(color = AutoserviceColors.Action)
                Text("正在加载企业字典与权限", modifier = Modifier.padding(top = AutoserviceSpacing.Md))
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(AutoserviceSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
            ) {
                item {
                    Text(
                        state.step.title,
                        style = MaterialTheme.typography.headlineSmall,
                        color = AutoserviceColors.Ink,
                        fontWeight = FontWeight.Bold,
                    )
                }
                when (state.step) {
                    CreateOrderStep.CUSTOMER -> customerFields(state, onUpdate)
                    CreateOrderStep.INSURANCE -> insuranceFields(state, onUpdate)
                    CreateOrderStep.REPAIR -> repairFields(state, onUpdate)
                    CreateOrderStep.CONFIRM -> confirmContent(state)
                }
                state.message?.let { message ->
                    item {
                        Surface(
                            shape = AutoservicePanelShape,
                            color = if (state.canCreate) AutoserviceColors.Ice else AutoserviceColors.SurfaceSoft,
                        ) {
                            Text(
                                message,
                                modifier = Modifier.padding(AutoserviceSpacing.Md),
                                color = AutoserviceColors.Ink,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }
        }
        CreateFooter(state, onBack, onNext, onSubmit, onConfirmUnknown, onSaveDraft)
    }

    if (state.showLeaveConfirmation) {
        AlertDialog(
            onDismissRequest = onContinueEditing,
            title = { Text("保留当前填写内容？") },
            text = { Text("草稿仅加密保存在当前设备，尚未成为正式工单。") },
            confirmButton = {
                TextButton(onClick = onSaveAndExit) { Text("保存草稿并退出") }
            },
            dismissButton = {
                Column(horizontalAlignment = Alignment.End) {
                    TextButton(onClick = onContinueEditing) { Text("继续编辑") }
                    TextButton(onClick = onDiscardAndExit) { Text("放弃草稿", color = AutoserviceColors.Danger) }
                }
            },
            shape = AutoservicePanelShape,
            containerColor = AutoserviceColors.Surface,
        )
    }
}

@Composable
private fun CreateHeader(step: CreateOrderStep, submitting: Boolean, onExit: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Lg),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text("新增维修工单", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "第 ${step.ordinal + 1} / ${CreateOrderStep.entries.size} 步 · 编号由服务端生成",
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.InkMuted,
            )
        }
        BrandButton(
            onClick = onExit,
            modifier = Modifier.testTag(CreateOrderTestTags.CLOSE_ACTION),
            tone = BrandButtonTone.QUIET,
            icon = BrandIconResource.Close,
            enabled = !submitting,
        ) { Text("关闭") }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.customerFields(
    state: CreateOrderUiState,
    onUpdate: (CreateOrderField, String) -> Unit,
) {
    item { CreateTextField(state, CreateOrderField.CUSTOMER, "客户姓名 *", onUpdate) }
    item { CreateTextField(state, CreateOrderField.PHONE, "手机号 *", onUpdate) }
    item { CreateTextField(state, CreateOrderField.PLATE, "车牌号 *", onUpdate) }
    item { CreateTextField(state, CreateOrderField.CAR, "车型 *", onUpdate) }
    item { CreateTextField(state, CreateOrderField.VIN, "VIN / 车架号", onUpdate) }
    item {
        CreateOptionField(
            state, CreateOrderField.STAFF, "负责人",
            state.metadata?.options?.staff?.map { it.name }.orEmpty(), onUpdate,
        )
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.insuranceFields(
    state: CreateOrderUiState,
    onUpdate: (CreateOrderField, String) -> Unit,
) {
    item { CreateTextField(state, CreateOrderField.INSURANCE_EXPIRY, "保险到期日 *（YYYY-MM-DD）", onUpdate) }
    item { CreateOptionField(state, CreateOrderField.INSURER, "保险公司", state.metadata?.options?.insurers.orEmpty(), onUpdate) }
    item { CreateOptionField(state, CreateOrderField.TYPE, "车辆类型", state.metadata?.options?.vehicleTypes.orEmpty(), onUpdate) }
    item { CreateOptionField(state, CreateOrderField.ACCIDENT_TYPE, "事故类型", state.metadata?.options?.accidentTypes.orEmpty(), onUpdate) }
    item { CreateTextField(state, CreateOrderField.CLAIM_NO, "保险案件号", onUpdate) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.repairFields(
    state: CreateOrderUiState,
    onUpdate: (CreateOrderField, String) -> Unit,
) {
    item { CreateTextField(state, CreateOrderField.RECORD, "维修项目 *", onUpdate, multiline = true) }
    item { CreateTextField(state, CreateOrderField.LABOR, "工时费", onUpdate) }
    item { CreateTextField(state, CreateOrderField.MATERIAL, "材料费", onUpdate) }
    item {
        CreateOptionField(
            state = state,
            field = CreateOrderField.DELIVERY,
            label = "预计交车",
            options = state.metadata?.options?.deliverySuggestions.orEmpty(),
            onUpdate = onUpdate,
            allowCustomInput = true,
        )
    }
    item { CreateTextField(state, CreateOrderField.REMARK, "接待备注", onUpdate, multiline = true) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.confirmContent(state: CreateOrderUiState) {
    val rows = listOf(
        "客户" to state.fields.customer,
        "联系电话" to state.fields.phone,
        "车辆" to "${state.fields.plate} · ${state.fields.car}",
        "负责人" to state.fields.staff.ifBlank { "待分配" },
        "保险" to "${state.fields.insurer} · ${state.fields.insuranceExpiry}",
        "事故类型" to state.fields.accidentType,
        "维修项目" to state.fields.record,
        "预计交车" to state.fields.delivery.ifBlank { "待确认" },
    )
    items(rows) { (label, value) ->
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
    item {
        Text(
            text = "预计总金额  ¥${estimatedTotal(state)}",
            modifier = Modifier.fillMaxWidth().padding(vertical = AutoserviceSpacing.Md),
            style = MaterialTheme.typography.titleLarge,
            color = AutoserviceColors.Action,
            textAlign = TextAlign.End,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun CreateFooter(
    state: CreateOrderUiState,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onSubmit: () -> Unit,
    onConfirmUnknown: () -> Unit,
    onSaveDraft: () -> Unit,
) {
    Surface(color = AutoserviceColors.Surface, shadowElevation = 8.dp) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        ) {
            BrandButton(
                onClick = onBack,
                modifier = Modifier.weight(1f).testTag(CreateOrderTestTags.BACK_ACTION),
                tone = BrandButtonTone.SECONDARY,
                enabled = state.step != CreateOrderStep.CUSTOMER && !state.submitting,
            ) { Text("上一步") }
            BrandButton(
                onClick = onSaveDraft,
                modifier = Modifier.weight(1.1f).testTag(CreateOrderTestTags.SAVE_ACTION),
                tone = BrandButtonTone.QUIET,
                enabled = state.dirty && !state.submitting,
            ) { Text("保存草稿") }
            val finalEnabled = state.connection == ConnectionState.Online && state.canCreate && !state.submitting
            val confirmationEnabled = state.connection == ConnectionState.Online && !state.submitting
            BrandButton(
                onClick = when {
                    state.unknownOperationId != null -> onConfirmUnknown
                    state.step == CreateOrderStep.CONFIRM -> onSubmit
                    else -> onNext
                },
                modifier = Modifier.weight(1.5f).testTag(CreateOrderTestTags.PRIMARY_ACTION),
                loading = state.submitting,
                enabled = when {
                    state.unknownOperationId != null -> confirmationEnabled
                    state.step == CreateOrderStep.CONFIRM -> finalEnabled
                    else -> !state.loading && !state.submitting
                },
            ) {
                Text(
                    when {
                        state.unknownOperationId != null -> "确认提交结果"
                        state.step == CreateOrderStep.CONFIRM -> "确认并创建"
                        else -> "下一步"
                    },
                )
            }
        }
    }
}

private fun estimatedTotal(state: CreateOrderUiState): String {
    fun cents(text: String): Long {
        val value = text.trim().toBigDecimalOrNull() ?: return 0
        return runCatching { value.movePointRight(2).longValueExact() }.getOrDefault(0)
    }
    val total = cents(state.fields.labor) + cents(state.fields.material)
    return "${total / 100}.${(total % 100).toString().padStart(2, '0')}"
}
