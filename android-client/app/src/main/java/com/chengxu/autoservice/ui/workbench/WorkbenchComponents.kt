package com.chengxu.autoservice.ui.workbench

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.MetricCard
import com.chengxu.autoservice.core.designsystem.StatusChip
import com.chengxu.autoservice.core.designsystem.StatusTone

@Composable
internal fun WorkbenchHeader(state: WorkbenchUiState) {
    Column(
        modifier = Modifier.padding(bottom = AutoserviceSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
    ) {
        if (state.staffName.isNotBlank()) {
            Text(text = "你好，${state.staffName}", style = MaterialTheme.typography.titleMedium)
        }
        Text(
            text = state.companyName,
            style = MaterialTheme.typography.titleMedium,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(text = state.title, style = MaterialTheme.typography.headlineMedium)
        Text(
            text = state.subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun WorkbenchSectionTitle(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(top = AutoserviceSpacing.Lg, bottom = AutoserviceSpacing.Sm),
        style = MaterialTheme.typography.titleMedium,
    )
}

@Composable
internal fun WorkbenchActions(
    actions: List<WorkbenchAction>,
    onAction: (WorkbenchAction) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
        actions.forEach { action ->
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = { onAction(action) },
            ) {
                Text(action.label)
            }
        }
    }
}

@Composable
internal fun WorkbenchMetricGrid(metrics: List<WorkbenchMetric>) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
        metrics.chunked(2).forEach { rowMetrics ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            ) {
                rowMetrics.forEach { metric ->
                    MetricCard(
                        label = metric.label,
                        value = metric.value,
                        supportText = metric.detail,
                        valueTone = metric.tone,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
internal fun WorkbenchOrderCard(order: WorkbenchOrder) {
    AutoserviceCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "${order.plateNumber} · ${order.customerName}", style = MaterialTheme.typography.titleSmall)
                Text(
                    text = order.repairSummary,
                    modifier = Modifier.padding(top = AutoserviceSpacing.Xs),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            StatusChip(
                text = order.statusLabel,
                icon = Icons.Outlined.Info,
                tone = order.statusTone,
                modifier = Modifier.padding(start = AutoserviceSpacing.Sm),
            )
        }
        Text(
            text = "${order.orderNumber} · ${order.amountLabel}",
            modifier = Modifier.padding(top = AutoserviceSpacing.Sm),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private val WorkbenchOrder.statusTone: StatusTone
    get() = when (statusLabel) {
        "在修" -> StatusTone.SUCCESS
        "待结算" -> StatusTone.WARNING
        "保险到期" -> StatusTone.DANGER
        else -> StatusTone.PRIMARY
    }
