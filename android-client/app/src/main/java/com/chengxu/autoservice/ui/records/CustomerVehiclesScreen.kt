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
import com.chengxu.autoservice.core.orders.CustomerVehicleRecord

@Composable
fun CustomerVehiclesScreen(
    state: CustomerVehiclesUiState,
    onQueryChange: (String) -> Unit,
    onCreate: () -> Unit,
    onSelected: (String) -> Unit,
    onDraftChange: ((CustomerVehicleRecord) -> CustomerVehicleRecord) -> Unit,
    onSave: () -> Unit,
    onDismissEditor: () -> Unit,
    modifier: Modifier = Modifier,
) {
    state.draft?.let { draft -> CustomerVehicleEditor(
        draft = draft,
        submitDisabled = state.submitDisabled,
        onChange = onDraftChange,
        onSave = onSave,
        onCancel = onDismissEditor,
        modifier = modifier,
    ) } ?: LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Md), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        item { BrandTextField(value = state.query, onValueChange = onQueryChange, label = "搜索客户、车牌、车型或 VIN") }
        if (state.canManage) item { Button(onClick = onCreate, enabled = !state.submitDisabled, modifier = Modifier.fillMaxWidth()) { Text("新增客户车辆") } }
        state.syncMessage?.let { item { Text(it, style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted) } }
        when {
            state.loading -> item { EmptyVehicles("正在读取车辆档案") }
            state.records.isEmpty() -> item { EmptyVehicles("暂无客户车辆档案") }
            state.visibleRecords.isEmpty() -> item { EmptyVehicles("未找到匹配车辆") }
            else -> items(state.visibleRecords, key = { it.id }) { VehicleCard(it) { onSelected(it.id) } }
        }
    }
}

@Composable
private fun CustomerVehicleEditor(
    draft: CustomerVehicleRecord,
    submitDisabled: Boolean,
    onChange: ((CustomerVehicleRecord) -> CustomerVehicleRecord) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier,
) = LazyColumn(
    modifier = modifier.fillMaxSize(),
    contentPadding = PaddingValues(AutoserviceSpacing.Lg),
    verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
) {
    item { Text("客户车辆档案", style = MaterialTheme.typography.headlineSmall) }
    item { BrandTextField(draft.customer, { value -> onChange { it.copy(customer = value) } }, "客户姓名") }
    item { BrandTextField(draft.phone, { value -> onChange { it.copy(phone = value) } }, "联系电话") }
    item { BrandTextField(draft.plate, { value -> onChange { it.copy(plate = value) } }, "车牌号") }
    item { BrandTextField(draft.car, { value -> onChange { it.copy(car = value) } }, "车型") }
    item { BrandTextField(draft.vin, { value -> onChange { it.copy(vin = value) } }, "VIN / 车架号") }
    item { BrandTextField(draft.insurer, { value -> onChange { it.copy(insurer = value) } }, "保险公司") }
    item { BrandTextField(draft.vehicleType, { value -> onChange { it.copy(vehicleType = value) } }, "车辆类型（标的车 / 三者车）") }
    item { BrandTextField(draft.source, { value -> onChange { it.copy(source = value) } }, "档案来源") }
    item { BrandTextField(draft.remark, { value -> onChange { it.copy(remark = value) } }, "备注") }
    item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
        OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("取消") }
        Button(onClick = onSave, enabled = !submitDisabled && isValidVehicleDraft(draft), modifier = Modifier.weight(1f)) { Text("保存") }
    } }
}

@Composable private fun VehicleCard(record: CustomerVehicleRecord, onClick: () -> Unit) = AutoserviceCard(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(record.plate.ifBlank { "未登记车牌" }, style = MaterialTheme.typography.titleMedium)
            Text(record.vehicleType, style = MaterialTheme.typography.labelMedium, color = AutoserviceColors.InkMuted)
        }
        Text(listOf(record.customer, record.phone).filter(String::isNotBlank).joinToString(" · "), style = MaterialTheme.typography.bodyMedium)
        Text(listOf(record.car, record.vin.takeLast(6).takeIf { record.vin.isNotBlank() }?.let { "VIN $it" }).filterNotNull().filter(String::isNotBlank).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted)
    }
}

@Composable private fun EmptyVehicles(text: String) = Column(Modifier.fillMaxWidth().padding(vertical = AutoserviceSpacing.Xl), horizontalAlignment = Alignment.CenterHorizontally) { Text(text, style = MaterialTheme.typography.titleMedium) }

@Composable fun CustomerVehicleDetailScreen(
    record: CustomerVehicleRecord?,
    canManage: Boolean,
    submitDisabled: Boolean,
    onEdit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(AutoserviceSpacing.Lg), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        item { Text("客户车辆详情", style = MaterialTheme.typography.headlineSmall) }
        if (record == null) item { EmptyVehicles("车辆档案不存在或已更新") } else {
            item { AutoserviceCard(Modifier.fillMaxWidth()) { Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) { DetailRow("客户", record.customer); DetailRow("电话", record.phone); DetailRow("车牌", record.plate); DetailRow("车型", record.car); DetailRow("车辆类型", record.vehicleType); DetailRow("VIN / 车架号", record.vin); DetailRow("保险公司", record.insurer); DetailRow("来源", record.source); DetailRow("备注", record.remark) } } }
            if (canManage) item { Button(onClick = onEdit, enabled = !submitDisabled, modifier = Modifier.fillMaxWidth()) { Text("编辑") } }
            item { Text("返回", modifier = Modifier.clickable(onClick = onBack), color = AutoserviceColors.Action, style = MaterialTheme.typography.titleMedium) }
        }
    }
}
private fun isValidVehicleDraft(draft: CustomerVehicleRecord) = listOf(draft.customer, draft.plate, draft.car).all(String::isNotBlank)
@Composable private fun DetailRow(label: String, value: String) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = AutoserviceColors.InkMuted); Text(value.ifBlank { "—" }) } }
