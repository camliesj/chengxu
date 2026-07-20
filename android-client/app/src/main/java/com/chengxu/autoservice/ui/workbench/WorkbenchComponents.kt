package com.chengxu.autoservice.ui.workbench

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoservicePanelShape
import com.chengxu.autoservice.core.designsystem.AutoserviceShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.designsystem.MetricCard
import com.chengxu.autoservice.core.designsystem.StatusChip
import com.chengxu.autoservice.core.designsystem.StatusTone
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState

@Composable
internal fun WorkbenchHero(
    state: WorkbenchUiState,
    isAdministrator: Boolean,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = AutoservicePanelShape,
        color = AutoserviceColors.Ice,
        contentColor = AutoserviceColors.Ink,
    ) {
        Row(
            modifier = Modifier.padding(AutoserviceSpacing.Lg),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
            verticalAlignment = Alignment.Top,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
            ) {
                Text(
                    text = state.title,
                    style = MaterialTheme.typography.labelMedium,
                    color = AutoserviceColors.InkMuted,
                )
                Text(
                    text = if (state.staffName.isBlank()) {
                        if (isAdministrator) "经营与调度" else "维修顾问工作台"
                    } else {
                        "你好，${state.staffName}"
                    },
                    style = MaterialTheme.typography.headlineSmall,
                    color = AutoserviceColors.Ink,
                )
                Text(
                    text = state.companyName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AutoserviceColors.InkMuted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (state.subtitle.isNotBlank()) {
                    Text(
                        text = state.subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = AutoserviceColors.InkMuted,
                    )
                }
            }
            StatusChip(
                text = if (state.connection == ConnectionState.Offline) "只读" else "在线",
                icon = if (state.connection == ConnectionState.Offline) {
                    BrandIconResource.Offline
                } else {
                    BrandIconResource.Cloud
                },
                tone = if (state.connection == ConnectionState.Offline) StatusTone.WARNING else StatusTone.SUCCESS,
            )
        }
    }
}

@Composable
internal fun WorkbenchStatusBand(metrics: List<WorkbenchMetric>) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = AutoserviceShape,
        color = AutoserviceColors.Surface,
        contentColor = AutoserviceColors.Ink,
        border = BorderStroke(1.dp, AutoserviceColors.Line),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            metrics.forEachIndexed { index, metric ->
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 76.dp)
                        .padding(horizontal = AutoserviceSpacing.Xs, vertical = AutoserviceSpacing.Md),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = metric.value,
                        style = MaterialTheme.typography.titleLarge,
                        color = metric.tone.color,
                        maxLines = 1,
                    )
                    Text(
                        text = metric.label,
                        modifier = Modifier.padding(top = AutoserviceSpacing.Xs),
                        style = MaterialTheme.typography.labelSmall,
                        color = AutoserviceColors.InkMuted,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (index < metrics.lastIndex) {
                    VerticalDivider(
                        modifier = Modifier.heightIn(min = 76.dp),
                        color = AutoserviceColors.Line,
                    )
                }
            }
        }
    }
}

@Composable
internal fun WorkbenchSectionTitle(
    title: String,
    supportingText: String? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = AutoserviceColors.Ink,
        )
        supportingText?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.labelSmall,
                color = AutoserviceColors.InkMuted,
            )
        }
    }
}

@Composable
internal fun WorkbenchQuickActions(
    actions: List<WorkbenchAction>,
    onAction: (WorkbenchAction) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
        actions.chunked(3).forEach { rowActions ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            ) {
                rowActions.forEach { action ->
                    BrandButton(
                        onClick = { onAction(action) },
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 64.dp),
                        tone = BrandButtonTone.SECONDARY,
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
                        ) {
                            BrandIcon(
                                resource = action.icon,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                text = action.label,
                                style = MaterialTheme.typography.labelSmall,
                                textAlign = TextAlign.Center,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
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
internal fun WorkbenchOrderCard(
    order: WorkbenchOrder,
    onClick: () -> Unit,
) {
    AutoserviceCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${order.plateNumber} · ${order.customerName}",
                    style = MaterialTheme.typography.titleSmall,
                    color = AutoserviceColors.Ink,
                )
                Text(
                    text = order.repairSummary,
                    modifier = Modifier.padding(top = AutoserviceSpacing.Xs),
                    style = MaterialTheme.typography.bodySmall,
                    color = AutoserviceColors.InkMuted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            BrandIcon(
                resource = BrandIconResource.ArrowRight,
                contentDescription = "查看工单",
                modifier = Modifier.size(20.dp),
                tint = AutoserviceColors.InkMuted,
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = AutoserviceSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "${order.orderNumber} · ${order.amountLabel}",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.InkMuted,
            )
            StatusChip(
                text = order.statusLabel,
                icon = order.statusIcon,
                tone = order.statusTone,
            )
        }
    }
}

private val WorkbenchAction.icon: BrandIconResource
    get() = when (permission) {
        AppPermission.CREATE_ORDER -> BrandIconResource.Add
        AppPermission.ADVANCE_ORDER_STATUS -> BrandIconResource.Tools
        AppPermission.SETTLE_ORDER -> BrandIconResource.Wallet
        else -> BrandIconResource.Warning
    }

private val WorkbenchOrder.statusIcon: BrandIconResource
    get() = when (statusLabel) {
        "在修中" -> BrandIconResource.Tools
        "待结算", "已结算" -> BrandIconResource.Wallet
        "已完工" -> BrandIconResource.Orders
        else -> BrandIconResource.Orders
    }

private val WorkbenchOrder.statusTone: StatusTone
    get() = when (statusLabel) {
        "在修中" -> StatusTone.SUCCESS
        "待结算" -> StatusTone.WARNING
        "已完工" -> StatusTone.PRIMARY
        "已结算" -> StatusTone.PRIMARY
        else -> StatusTone.PRIMARY
    }
