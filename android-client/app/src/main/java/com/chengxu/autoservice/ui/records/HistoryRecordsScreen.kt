package com.chengxu.autoservice.ui.records

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
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
import com.chengxu.autoservice.core.designsystem.BrandTextField
import com.chengxu.autoservice.core.designsystem.StatusChip
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.toDesignTone

object HistoryRecordsTestTags {
    const val ROOT = "history-records-root"
    const val READ_ONLY_NOTICE = "history-records-read-only"
    const val SEARCH = "history-records-search"
    const val FILTER_PREFIX = "history-records-filter-"
    const val ORDER_CARD_PREFIX = "history-records-card-"
    const val RETRY = "history-records-retry"
    const val LOAD_MORE = "history-records-load-more"
    const val CLEAR_FILTERS = "history-records-clear-filters"
}

@Composable
fun HistoryRecordsScreen(
    state: HistoryRecordsUiState,
    isOffline: Boolean,
    onQueryChange: (String) -> Unit,
    onTimeFilterChange: (HistoryTimeFilter) -> Unit,
    onClearFilters: () -> Unit,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit,
    onOrderSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .testTag(HistoryRecordsTestTags.ROOT),
        contentPadding = PaddingValues(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Xl),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("已结算历史档案", style = MaterialTheme.typography.headlineSmall, color = AutoserviceColors.Ink)
                Text("共 ${state.visibleCount} 单", style = MaterialTheme.typography.labelLarge, color = AutoserviceColors.InkMuted)
            }
        }
        item { ReadOnlyNotice() }
        item {
            BrandTextField(
                value = state.query,
                onValueChange = onQueryChange,
                label = "搜索工单号、车牌、客户",
                modifier = Modifier.testTag(HistoryRecordsTestTags.SEARCH),
            )
        }
        item { HistoryTimeFilters(state.timeFilter, onTimeFilterChange) }
        if (state.refreshing) item { HistoryMessage("正在同步历史档案…") }
        state.syncMessage?.let { message ->
            item {
                HistoryMessage(
                    message = message,
                    retry = state.showRetry && !isOffline,
                    onRetry = onRefresh,
                )
            }
        }
        when {
            state.loading && state.allOrders.isEmpty() -> item { HistoryEmptyState("正在读取历史档案", "正在读取当前企业的缓存数据") }
            state.allOrders.isEmpty() && state.syncMessage != null -> item { HistoryEmptyState("暂时无法读取历史档案", "请检查网络后重新同步") }
            state.allOrders.isEmpty() -> item { HistoryEmptyState("暂无已结算档案", "当前企业还没有已结算工单") }
            state.visibleOrders.isEmpty() -> item { NoHistoryMatches(onClearFilters) }
            else -> items(state.visibleOrders, key = { it.id }) { order ->
                HistoryOrderCard(order, onClick = { onOrderSelected(order.id) })
            }
        }
        if (state.hasMore && state.visibleOrders.isNotEmpty()) {
            item {
                BrandButton(
                    onClick = onLoadMore,
                    enabled = !state.loadingNextPage && !isOffline,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp)
                        .testTag(HistoryRecordsTestTags.LOAD_MORE),
                    tone = BrandButtonTone.SECONDARY,
                ) {
                    Text(if (state.loadingNextPage) "正在加载…" else "加载更多历史记录")
                }
            }
        }
    }
}

@Composable
private fun ReadOnlyNotice() {
    Surface(
        modifier = Modifier.fillMaxWidth().testTag(HistoryRecordsTestTags.READ_ONLY_NOTICE),
        shape = AutoserviceShape,
        color = AutoserviceColors.Ice,
        contentColor = AutoserviceColors.Ink,
    ) {
        Row(
            modifier = Modifier.padding(AutoserviceSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandIcon(BrandIconResource.Records, null, Modifier.size(18.dp), AutoserviceColors.InkMuted)
            Text("历史档案仅供查看，不能编辑或变更状态", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun HistoryTimeFilters(selected: HistoryTimeFilter, onSelected: (HistoryTimeFilter) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        HistoryTimeFilter.entries.forEach { filter ->
            Surface(
                modifier = Modifier
                    .heightIn(min = 48.dp)
                    .testTag("${HistoryRecordsTestTags.FILTER_PREFIX}${filter.name}")
                    .selectable(filter == selected, role = Role.RadioButton) { onSelected(filter) },
                shape = AutoserviceControlShape,
                color = if (filter == selected) AutoserviceColors.Ice else AutoserviceColors.Surface,
                border = BorderStroke(1.dp, if (filter == selected) AutoserviceColors.Action else AutoserviceColors.Line),
            ) {
                Text(filter.label, modifier = Modifier.padding(horizontal = AutoserviceSpacing.Lg), style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun HistoryOrderCard(order: OrderDisplayModel, onClick: () -> Unit) {
    AutoserviceCard(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .testTag("${HistoryRecordsTestTags.ORDER_CARD_PREFIX}${order.id}")
            .clickable(onClick = onClick),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("${order.plate} · ${order.customer}", style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(order.serviceSummary, modifier = Modifier.padding(top = AutoserviceSpacing.Xs), style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("${order.dateTimeLabel} · ${order.amountLabel}", modifier = Modifier.padding(top = AutoserviceSpacing.Sm), style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                StatusChip(order.status, icon = BrandIconResource.Wallet, tone = order.statusTone.toDesignTone())
                BrandIcon(BrandIconResource.ArrowRight, "查看档案", Modifier.size(20.dp), AutoserviceColors.InkMuted)
            }
        }
    }
}

@Composable
private fun HistoryMessage(message: String, retry: Boolean = false, onRetry: () -> Unit = {}) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = AutoserviceShape, color = AutoserviceColors.Ice) {
        Row(modifier = Modifier.padding(AutoserviceSpacing.Md), verticalAlignment = Alignment.CenterVertically) {
            Text(message, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted)
            if (retry) BrandButton(onRetry, Modifier.testTag(HistoryRecordsTestTags.RETRY), BrandButtonTone.QUIET) { Text("重新同步") }
        }
    }
}

@Composable
private fun HistoryEmptyState(title: String, support: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = AutoserviceSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = AutoserviceColors.Ink)
        Text(support, style = MaterialTheme.typography.bodySmall, color = AutoserviceColors.InkMuted)
    }
}

@Composable
private fun NoHistoryMatches(onClearFilters: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = AutoserviceSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        Text("未找到匹配档案", style = MaterialTheme.typography.titleMedium, color = AutoserviceColors.Ink)
        BrandButton(onClearFilters, Modifier.testTag(HistoryRecordsTestTags.CLEAR_FILTERS), BrandButtonTone.SECONDARY) { Text("清除筛选") }
    }
}
