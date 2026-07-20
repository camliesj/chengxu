package com.chengxu.autoservice.ui.orders

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceControlShape
import com.chengxu.autoservice.core.designsystem.AutoserviceShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.designsystem.StatusChip
import com.chengxu.autoservice.core.designsystem.StatusTone

@Composable
internal fun OrdersFilterRow(
    selected: OrderStatusFilter,
    onSelected: (OrderStatusFilter) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        OrderStatusFilter.entries.forEach { filter ->
            val isSelected = filter == selected
            Surface(
                modifier = Modifier
                    .heightIn(min = 48.dp)
                    .testTag("${OrdersTestTags.FILTER_PREFIX}${filter.label}")
                    .selectable(
                        selected = isSelected,
                        role = Role.RadioButton,
                        onClick = { onSelected(filter) },
                    ),
                shape = AutoserviceControlShape,
                color = if (isSelected) AutoserviceColors.Ice else AutoserviceColors.Surface,
                contentColor = AutoserviceColors.Ink,
                border = BorderStroke(
                    width = 1.dp,
                    color = if (isSelected) AutoserviceColors.Action else AutoserviceColors.Line,
                ),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = AutoserviceSpacing.Lg),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(text = filter.label, style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

@Composable
internal fun OrderCard(
    order: OrderDisplayModel,
    onClick: () -> Unit,
) {
    AutoserviceCard(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .testTag("${OrdersTestTags.ORDER_CARD_PREFIX}${order.id}")
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${order.plate} · ${order.customer}",
                    style = MaterialTheme.typography.titleSmall,
                    color = AutoserviceColors.Ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = order.serviceSummary,
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
            BrandIcon(
                resource = BrandIconResource.Calendar,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = AutoserviceColors.InkMuted,
            )
            Text(
                text = order.dateTimeLabel,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.InkMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = order.amountLabel,
                style = MaterialTheme.typography.labelLarge,
                color = AutoserviceColors.Ink,
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
                text = order.id,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.InkMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            StatusChip(
                text = order.status,
                icon = order.statusIcon,
                tone = order.statusTone.toDesignTone(),
            )
        }
    }
}

@Composable
internal fun OrdersSyncPanel(
    message: String,
    showRetry: Boolean,
    onRetry: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = AutoserviceShape,
        color = AutoserviceColors.Ice,
        contentColor = AutoserviceColors.Ink,
    ) {
        Row(
            modifier = Modifier.padding(AutoserviceSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandIcon(
                resource = if (showRetry) BrandIconResource.Warning else BrandIconResource.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = AutoserviceColors.InkMuted,
            )
            Text(
                text = message,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.InkMuted,
            )
            if (showRetry) {
                BrandButton(
                    onClick = onRetry,
                    modifier = Modifier.testTag(OrdersTestTags.RETRY),
                    tone = BrandButtonTone.QUIET,
                ) {
                    Text("重新同步")
                }
            }
        }
    }
}

@Composable
internal fun LoadingOrdersState() {
    OrdersCenteredState(
        title = "正在加载工单",
        supportingText = "正在读取当前企业的缓存数据",
        showProgress = true,
    )
}

@Composable
internal fun ErrorOrdersState() {
    OrdersCenteredState(
        title = "暂时无法读取工单",
        supportingText = "请检查网络后重新同步",
    )
}

@Composable
internal fun EmptyOrdersState() {
    OrdersCenteredState(
        title = "暂无工单",
        supportingText = "当前企业还没有可查看的工单",
    )
}

@Composable
internal fun NoMatchingOrdersState(onClearFilters: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AutoserviceSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        Text(
            text = "没有匹配的工单",
            style = MaterialTheme.typography.titleMedium,
            color = AutoserviceColors.Ink,
        )
        Text(
            text = "请调整搜索内容或状态筛选",
            style = MaterialTheme.typography.bodySmall,
            color = AutoserviceColors.InkMuted,
        )
        BrandButton(
            onClick = onClearFilters,
            modifier = Modifier.testTag(OrdersTestTags.CLEAR_FILTERS),
            tone = BrandButtonTone.SECONDARY,
        ) {
            Text("清除筛选")
        }
    }
}

@Composable
private fun OrdersCenteredState(
    title: String,
    supportingText: String,
    showProgress: Boolean = false,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AutoserviceSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        if (showProgress) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                strokeWidth = 2.dp,
                color = AutoserviceColors.Action,
            )
        }
        Text(text = title, style = MaterialTheme.typography.titleMedium, color = AutoserviceColors.Ink)
        Text(text = supportingText, style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted)
    }
}

internal fun OrderStatusTone.toDesignTone(): StatusTone = when (this) {
    OrderStatusTone.PRIMARY -> StatusTone.PRIMARY
    OrderStatusTone.SUCCESS -> StatusTone.SUCCESS
    OrderStatusTone.WARNING -> StatusTone.WARNING
    OrderStatusTone.NEUTRAL -> StatusTone.NEUTRAL
}

private val OrderDisplayModel.statusIcon: BrandIconResource
    get() = when (status) {
        "在修中" -> BrandIconResource.Tools
        "待结算", "已结算" -> BrandIconResource.Wallet
        else -> BrandIconResource.Orders
    }
