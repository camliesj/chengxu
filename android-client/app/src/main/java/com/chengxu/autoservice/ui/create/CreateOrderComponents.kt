package com.chengxu.autoservice.ui.create

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceControlShape
import com.chengxu.autoservice.core.designsystem.AutoserviceShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandTextField

object CreateOrderTestTags {
    const val FIELD_PREFIX = "create-order-field-"
    const val PRIMARY_ACTION = "create-order-primary"
    const val BACK_ACTION = "create-order-back"
    const val SAVE_ACTION = "create-order-save"
    const val CLOSE_ACTION = "create-order-close"
}

@Composable
internal fun CreateProgress(current: CreateOrderStep) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        CreateOrderStep.entries.forEach { step ->
            val active = step == current
            val completed = step.ordinal < current.ordinal
            Surface(
                modifier = Modifier.weight(1f),
                shape = AutoserviceShape,
                color = if (active || completed) AutoserviceColors.Ice else AutoserviceColors.SurfaceSoft,
                border = BorderStroke(
                    1.dp,
                    if (active) AutoserviceColors.Action else AutoserviceColors.Line,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = "${step.ordinal + 1}",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (active || completed) AutoserviceColors.Action else AutoserviceColors.InkMuted,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = step.title.take(2),
                        style = MaterialTheme.typography.labelSmall,
                        color = AutoserviceColors.Ink,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
internal fun CreateTextField(
    state: CreateOrderUiState,
    field: CreateOrderField,
    label: String,
    onUpdate: (CreateOrderField, String) -> Unit,
    multiline: Boolean = false,
) {
    val error = state.fieldErrors[field]?.let(::createErrorText)
    if (multiline) {
        OutlinedTextField(
            value = state.fields.value(field),
            onValueChange = { onUpdate(field, it) },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 104.dp)
                .testTag("${CreateOrderTestTags.FIELD_PREFIX}${field.wireName}"),
            label = { Text(label) },
            minLines = 3,
            maxLines = 6,
            enabled = !state.submitting,
            isError = error != null,
            supportingText = error?.let { { Text(it) } },
            shape = AutoserviceControlShape,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AutoserviceColors.Action,
                unfocusedBorderColor = AutoserviceColors.Line,
                errorBorderColor = AutoserviceColors.Danger,
                focusedContainerColor = AutoserviceColors.Surface,
                unfocusedContainerColor = AutoserviceColors.Surface,
            ),
        )
    } else {
        BrandTextField(
            value = state.fields.value(field),
            onValueChange = { onUpdate(field, it) },
            label = label,
            error = error,
            enabled = !state.submitting,
            modifier = Modifier.testTag("${CreateOrderTestTags.FIELD_PREFIX}${field.wireName}"),
        )
    }
}

@Composable
internal fun CreateOptionField(
    state: CreateOrderUiState,
    field: CreateOrderField,
    label: String,
    options: List<String>,
    onUpdate: (CreateOrderField, String) -> Unit,
    allowCustomInput: Boolean = false,
) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = AutoserviceColors.Ink)
        if (options.isEmpty()) {
            CreateTextField(state, field, label, onUpdate)
        } else {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                items(options.distinct(), key = { it }) { option ->
                    FilterChip(
                        selected = state.fields.value(field) == option,
                        onClick = { onUpdate(field, option) },
                        enabled = !state.submitting,
                        label = { Text(option) },
                        modifier = Modifier.heightIn(min = 48.dp),
                        shape = AutoserviceControlShape,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AutoserviceColors.Ice,
                            selectedLabelColor = AutoserviceColors.Ink,
                            containerColor = AutoserviceColors.Surface,
                            labelColor = AutoserviceColors.InkMuted,
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = !state.submitting,
                            selected = state.fields.value(field) == option,
                            borderColor = AutoserviceColors.Line,
                            selectedBorderColor = AutoserviceColors.Action,
                        ),
                    )
                }
            }
            if (allowCustomInput) {
                CreateTextField(state, field, "自定义预计交车时间", onUpdate)
            }
        }
        state.fieldErrors[field]?.takeUnless { allowCustomInput }?.let {
            Text(createErrorText(it), style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.Danger)
        }
    }
}

internal fun createErrorText(code: String): String = when (code) {
    "order.customer.required" -> "请输入客户姓名"
    "order.phone.required" -> "请输入手机号"
    "order.plate.required" -> "请输入车牌号"
    "order.car.required" -> "请输入车型"
    "order.insuranceExpiry.required" -> "请选择保险到期日"
    "order.insuranceExpiry.invalid_date" -> "保险到期日格式不正确"
    "order.record.required" -> "请输入维修项目"
    "order.laborCents.non_negative", "order.laborCents.non_negative_integer" -> "工时费不能为负数"
    "order.materialCents.non_negative", "order.materialCents.non_negative_integer" -> "材料费不能为负数"
    "order.laborCents.max_two_decimals", "order.materialCents.max_two_decimals" -> "金额最多保留两位小数"
    "order.laborCents.out_of_range", "order.materialCents.out_of_range" -> "金额超出可用范围"
    else -> if (code.endsWith(".too_long")) "填写内容过长" else "请检查此项"
}
