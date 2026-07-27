package com.chengxu.autoservice.ui.edit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.network.ConnectionState

object EditOrderTestTags {
    const val EDIT_ORDER = "edit_order"
    const val SAVE_DRAFT = "save_edit_draft"
    const val SUBMIT = "submit_edit"
    const val CONFIRM = "confirm_edit_result"
    const val RETURN = "return_to_detail"
    const val REBASE = "rebase_edit"
}

@Composable
fun EditOrderScreen(
    state: EditOrderUiState,
    onUpdate: (EditOrderField, String) -> Unit,
    onSubmit: () -> Unit,
    onConfirm: () -> Unit,
    onSaveDraft: () -> Unit,
    onReturn: () -> Unit,
    onRebase: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize().padding(AutoserviceSpacing.Lg), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        Text("编辑维修工单", color = AutoserviceColors.Ink)
        if (state.connection == ConnectionState.Offline) Text("离线时可保存草稿，联网后才可提交", color = AutoserviceColors.Warning)
        when (state.submitState) {
            EditSubmitState.CONFLICT -> ConflictContent(state, onReturn, onRebase)
            else -> {
                OutlinedTextField(state.fields.customer, { onUpdate(EditOrderField.CUSTOMER, it) }, label = { Text("客户") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(state.fields.plate, { onUpdate(EditOrderField.PLATE, it) }, label = { Text("车牌") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(state.fields.record, { onUpdate(EditOrderField.RECORD, it) }, label = { Text("维修项目") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                OutlinedTextField(state.fields.remark, { onUpdate(EditOrderField.REMARK, it) }, label = { Text("备注") }, modifier = Modifier.fillMaxWidth())
                state.message?.let { Text(it, color = AutoserviceColors.InkMuted) }
                Row(modifier = Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                    BrandButton(onClick = onSaveDraft, modifier = Modifier.weight(1f).testTag(EditOrderTestTags.SAVE_DRAFT), tone = BrandButtonTone.QUIET, enabled = state.dirty) { Text("保存草稿") }
                    BrandButton(
                        onClick = if (state.submitState == EditSubmitState.CONFIRMING) onConfirm else onSubmit,
                        modifier = Modifier.weight(1f).testTag(if (state.submitState == EditSubmitState.CONFIRMING) EditOrderTestTags.CONFIRM else EditOrderTestTags.SUBMIT),
                        enabled = state.connection == ConnectionState.Online && state.canEdit && state.submitState != EditSubmitState.SUBMITTING,
                        loading = state.submitState == EditSubmitState.SUBMITTING,
                    ) { Text(if (state.submitState == EditSubmitState.CONFIRMING) "确认提交结果" else "提交编辑") }
                }
            }
        }
    }
}

@Composable
private fun ConflictContent(state: EditOrderUiState, onReturn: () -> Unit, onRebase: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        Text("工单已被其他人更新", color = AutoserviceColors.Danger)
        state.conflictingFields.forEach { field ->
            Surface(color = AutoserviceColors.SurfaceSoft) {
                Text("$field：服务器「${state.latest?.let { latestValue(it, field) }.orEmpty()}」/ 本地「${localValue(state, field)}」", modifier = Modifier.padding(AutoserviceSpacing.Md))
            }
        }
        BrandButton(onClick = onReturn, modifier = Modifier.fillMaxWidth().testTag(EditOrderTestTags.RETURN), tone = BrandButtonTone.SECONDARY) { Text("返回最新详情") }
        BrandButton(onClick = onRebase, modifier = Modifier.fillMaxWidth().testTag(EditOrderTestTags.REBASE)) { Text("基于最新版本继续编辑") }
    }
}

private fun latestValue(detail: com.chengxu.autoservice.core.orders.model.OrderDetail, field: String) = when (field) {
    "record" -> detail.summary.record; "laborCents" -> detail.laborCents.toString(); "materialCents" -> detail.materialCents.toString(); else -> ""
}
private fun localValue(state: EditOrderUiState, field: String) = when (field) {
    "record" -> state.fields.record; "laborCents" -> state.fields.labor; "materialCents" -> state.fields.material; else -> ""
}
