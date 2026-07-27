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
import androidx.compose.material3.MaterialTheme
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
fun CustomerVehiclesScreen(state: CustomerVehiclesUiState, onQueryChange: (String) -> Unit, onSelected: (String) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Md), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        item { BrandTextField(value = state.query, onValueChange = onQueryChange, label = "搜索客户、车牌、车型或 VIN") }
        state.syncMessage?.let { item { Text(it, style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted) } }
        when {
            state.loading -> item { EmptyVehicles("正在读取车辆档案") }
            state.records.isEmpty() -> item { EmptyVehicles("暂无客户车辆档案") }
            state.visibleRecords.isEmpty() -> item { EmptyVehicles("未找到匹配车辆") }
            else -> items(state.visibleRecords, key = { it.id }) { VehicleCard(it) { onSelected(it.id) } }
        }
    }
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

@Composable fun CustomerVehicleDetailScreen(record: CustomerVehicleRecord?, onBack: () -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(AutoserviceSpacing.Lg), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        item { Text("客户车辆详情", style = MaterialTheme.typography.headlineSmall) }
        if (record == null) item { EmptyVehicles("车辆档案不存在或已更新") } else {
            item { AutoserviceCard(Modifier.fillMaxWidth()) { Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) { DetailRow("客户", record.customer); DetailRow("电话", record.phone); DetailRow("车牌", record.plate); DetailRow("车型", record.car); DetailRow("车辆类型", record.vehicleType); DetailRow("VIN / 车架号", record.vin); DetailRow("保险公司", record.insurer); DetailRow("来源", record.source); DetailRow("备注", record.remark) } } }
            item { Text("返回", modifier = Modifier.clickable(onClick = onBack), color = AutoserviceColors.Action, style = MaterialTheme.typography.titleMedium) }
        }
    }
}
@Composable private fun DetailRow(label: String, value: String) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = AutoserviceColors.InkMuted); Text(value.ifBlank { "—" }) } }
