package com.chengxu.autoservice.ui.records

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandTextField
import com.chengxu.autoservice.core.orders.InsurancePolicyRecord
import java.time.LocalDate

@Composable
fun InsurancePoliciesScreen(
    state: InsurancePoliciesUiState,
    onQueryChange: (String) -> Unit,
    onCreate: () -> Unit,
    onSelected: (String) -> Unit,
    onDraftChange: ((InsurancePolicyRecord) -> InsurancePolicyRecord) -> Unit,
    onSave: () -> Unit,
    onDismissEditor: () -> Unit,
    onConfirmDelete: () -> Unit,
    onDismissDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    state.draft?.let { draft ->
        InsurancePolicyEditor(
            draft = draft,
            submitDisabled = state.submitDisabled,
            conflict = state.conflict,
            message = state.writeMessage,
            onChange = onDraftChange,
            onSave = onSave,
            onCancel = onDismissEditor,
            modifier = modifier,
        )
    } ?: LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Md),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        item { BrandTextField(state.query, onQueryChange, "搜索车牌、客户、VIN 或保险公司") }
        if (state.canManage) item {
            Button(onClick = onCreate, enabled = !state.submitDisabled, modifier = Modifier.fillMaxWidth()) { Text("新增保险") }
        }
        state.syncMessage?.let { item { Text(it, style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted) } }
        state.writeMessage?.let { item { Text(it, style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted) } }
        when {
            state.loading -> item { EmptyInsurance("正在读取保险档案") }
            state.records.isEmpty() -> item { EmptyInsurance("暂无保险档案") }
            state.visibleRecords.isEmpty() -> item { EmptyInsurance("未找到匹配保险") }
            else -> items(state.visibleRecords, key = { it.id }) { policy ->
                InsuranceCard(policy) { onSelected(policy.id) }
            }
        }
    }
    state.deleteTarget?.let { target -> AlertDialog(
        onDismissRequest = onDismissDelete,
        title = { Text("删除保险档案？") },
        text = { Text("将删除 ${target.plate.ifBlank { target.customer }} 的保险记录，此操作无法撤销。") },
        confirmButton = { Button(onClick = onConfirmDelete, enabled = !state.submitDisabled) { Text("确认删除") } },
        dismissButton = { OutlinedButton(onClick = onDismissDelete) { Text("取消") } },
    ) }
}

@Composable
fun InsurancePolicyDetailScreen(
    record: InsurancePolicyRecord?,
    canManage: Boolean,
    submitDisabled: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(AutoserviceSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        item { Text("保险档案详情", style = MaterialTheme.typography.headlineSmall) }
        if (record == null) item { EmptyInsurance("保险档案不存在或已更新") } else {
            item { AutoserviceCard(Modifier.fillMaxWidth()) { Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                InsuranceDetailRow("客户", record.customer); InsuranceDetailRow("电话", record.phone)
                InsuranceDetailRow("车牌", record.plate); InsuranceDetailRow("车型", record.car)
                InsuranceDetailRow("VIN / 车架号", record.vin); InsuranceDetailRow("保险类型", record.type)
                InsuranceDetailRow("保险公司", record.insurer); InsuranceDetailRow("到期日", record.expiry)
                InsuranceDetailRow("保额", record.amount.toString()); InsuranceDetailRow("版本", record.version.toString())
            } } }
            if (canManage) item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                OutlinedButton(onClick = onEdit, enabled = !submitDisabled, modifier = Modifier.weight(1f)) { Text("编辑") }
                Button(onClick = onDelete, enabled = !submitDisabled, modifier = Modifier.weight(1f)) { Text("删除") }
            } }
            item { Text("返回", modifier = Modifier.clickable(onClick = onBack), color = AutoserviceColors.Action, style = MaterialTheme.typography.titleMedium) }
        }
    }
}

@Composable private fun InsurancePolicyEditor(
    draft: InsurancePolicyRecord, submitDisabled: Boolean, conflict: InsurancePolicyRecord?, message: String?,
    onChange: ((InsurancePolicyRecord) -> InsurancePolicyRecord) -> Unit, onSave: () -> Unit, onCancel: () -> Unit, modifier: Modifier,
) = LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(AutoserviceSpacing.Lg), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
    item { Text(if (draft.version == 0) "新增保险" else "编辑保险", style = MaterialTheme.typography.headlineSmall) }
    item { BrandTextField(draft.customer, { value -> onChange { it.copy(customer = value) } }, "客户姓名") }
    item { BrandTextField(draft.phone, { value -> onChange { it.copy(phone = value) } }, "联系电话") }
    item { BrandTextField(draft.plate, { value -> onChange { it.copy(plate = value) } }, "车牌号") }
    item { BrandTextField(draft.car, { value -> onChange { it.copy(car = value) } }, "车型") }
    item { BrandTextField(draft.vin, { value -> onChange { it.copy(vin = value) } }, "VIN / 车架号") }
    item { BrandTextField(draft.type, { value -> onChange { it.copy(type = value) } }, "保险类型") }
    item { BrandTextField(draft.insurer, { value -> onChange { it.copy(insurer = value) } }, "保险公司") }
    item { BrandTextField(draft.expiry, { value -> onChange { it.copy(expiry = value) } }, "到期日（YYYY-MM-DD）") }
    item { BrandTextField(draft.amount.toString(), { value -> onChange { it.copy(amount = value.toLongOrNull() ?: 0L) } }, "保额") }
    conflict?.let { item { Text("记录已被其他人修改，已刷新当前列表；请核对后重新提交。", color = AutoserviceColors.InkMuted) } }
    message?.let { item { Text(it, color = AutoserviceColors.InkMuted) } }
    item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
        OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("取消") }
        Button(onClick = onSave, enabled = !submitDisabled && isValidInsuranceDraft(draft), modifier = Modifier.weight(1f)) { Text("保存") }
    } }
}

@Composable private fun InsuranceCard(record: InsurancePolicyRecord, onClick: () -> Unit) = AutoserviceCard(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(record.plate.ifBlank { "未登记车牌" }, style = MaterialTheme.typography.titleMedium)
            Text(insuranceExpiryLabel(record.expiry), style = MaterialTheme.typography.labelMedium, color = AutoserviceColors.InkMuted)
        }
        Text(listOf(record.customer, record.phone).filter(String::isNotBlank).joinToString(" · "), style = MaterialTheme.typography.bodyMedium)
        Text(listOf(record.type, record.insurer, record.expiry).filter(String::isNotBlank).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted)
    }
}

private fun isValidInsuranceDraft(draft: InsurancePolicyRecord) = listOf(draft.customer, draft.plate, draft.expiry).all(String::isNotBlank) && draft.amount >= 0L
private fun insuranceExpiryLabel(expiry: String): String = runCatching {
    val days = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(expiry))
    when { days < 0 -> "已过期"; days <= 7 -> "7天内到期"; days <= 30 -> "30天内到期"; else -> "正常" }
}.getOrDefault("到期日待补充")
@Composable private fun EmptyInsurance(text: String) = Column(Modifier.fillMaxWidth().padding(vertical = AutoserviceSpacing.Xl), horizontalAlignment = Alignment.CenterHorizontally) { Text(text, style = MaterialTheme.typography.titleMedium) }
@Composable private fun InsuranceDetailRow(label: String, value: String) = Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = AutoserviceColors.InkMuted); Text(value.ifBlank { "—" }) }
