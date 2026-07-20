package com.chengxu.autoservice.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandTextField

object OrdersTestTags {
    const val ROOT = "orders-root"
    const val SEARCH = "orders-search"
    const val FILTER_PREFIX = "orders-filter-"
    const val ORDER_CARD_PREFIX = "orders-card-"
    const val RETRY = "orders-retry"
    const val CLEAR_FILTERS = "orders-clear-filters"
}

@Composable
fun OrdersScreen(
    state: OrdersUiState,
    isOffline: Boolean,
    onQueryChange: (String) -> Unit,
    onFilterSelected: (OrderStatusFilter) -> Unit,
    onClearFilters: () -> Unit,
    onRefresh: () -> Unit,
    onOrderSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .testTag(OrdersTestTags.ROOT),
        contentPadding = PaddingValues(
            horizontal = AutoserviceSpacing.Lg,
            vertical = AutoserviceSpacing.Xl,
        ),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "工单",
                    style = MaterialTheme.typography.headlineSmall,
                    color = AutoserviceColors.Ink,
                )
                Text(
                    text = "共 ${state.visibleCount} 单",
                    style = MaterialTheme.typography.labelLarge,
                    color = AutoserviceColors.InkMuted,
                )
            }
        }
        item {
            BrandTextField(
                value = state.query,
                onValueChange = onQueryChange,
                label = "搜索工单号、车牌、客户",
                modifier = Modifier.testTag(OrdersTestTags.SEARCH),
            )
        }
        item {
            OrdersFilterRow(
                selected = state.selectedFilter,
                onSelected = onFilterSelected,
            )
        }
        if (state.refreshing) {
            item {
                OrdersSyncPanel(
                    message = "正在同步…",
                    showRetry = false,
                    onRetry = onRefresh,
                )
            }
        }
        state.syncMessage?.let { message ->
            item {
                OrdersSyncPanel(
                    message = message,
                    showRetry = state.showRetry && !isOffline,
                    onRetry = onRefresh,
                )
            }
        }
        when {
            state.loading && state.allOrders.isEmpty() -> item { LoadingOrdersState() }
            state.allOrders.isEmpty() && state.syncMessage != null -> item { ErrorOrdersState() }
            state.allOrders.isEmpty() -> item { EmptyOrdersState() }
            state.visibleOrders.isEmpty() -> item { NoMatchingOrdersState(onClearFilters) }
            else -> items(
                items = state.visibleOrders,
                key = { order -> order.id },
            ) { order ->
                OrderCard(
                    order = order,
                    onClick = { onOrderSelected(order.id) },
                )
            }
        }
    }
}
