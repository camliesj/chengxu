package com.chengxu.autoservice.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.designsystem.StatusChip

@Composable
fun OrderDetailScreen(
    order: OrderDisplayModel?,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = AutoserviceSpacing.Sm, vertical = AutoserviceSpacing.Xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.size(48.dp),
            ) {
                BrandIcon(
                    resource = BrandIconResource.ArrowRight,
                    contentDescription = "返回",
                    modifier = Modifier.size(22.dp).rotate(180f),
                    tint = AutoserviceColors.Ink,
                )
            }
            Text(
                text = "工单详情",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.titleLarge,
                color = AutoserviceColors.Ink,
            )
        }

        if (order == null) {
            MissingOrderDetail(onBack = onBack)
        } else {
            OrderDetailContent(
                order = order,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun OrderDetailContent(
    order: OrderDisplayModel,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Md),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        AutoserviceCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = order.plate,
                        style = MaterialTheme.typography.headlineSmall,
                        color = AutoserviceColors.Ink,
                    )
                    Text(
                        text = order.customer,
                        modifier = Modifier.padding(top = AutoserviceSpacing.Xs),
                        style = MaterialTheme.typography.bodyMedium,
                        color = AutoserviceColors.InkMuted,
                    )
                }
                StatusChip(
                    text = order.status,
                    icon = BrandIconResource.Orders,
                    tone = order.statusTone.toDesignTone(),
                )
            }
            Text(
                text = order.serviceSummary,
                modifier = Modifier.padding(top = AutoserviceSpacing.Md),
                style = MaterialTheme.typography.bodyMedium,
                color = AutoserviceColors.InkMuted,
            )
        }

        DetailSection(
            title = "工单信息",
            icon = BrandIconResource.Orders,
            rows = listOf(
                "工单号" to order.id,
                "日期时间" to order.dateTimeLabel,
                "状态" to order.status,
            ),
        )
        DetailSection(
            title = "车辆与服务",
            icon = BrandIconResource.Car,
            rows = listOf(
                "车牌" to order.plate,
                "客户" to order.customer,
                "车型" to order.car,
                "维修类型" to order.type,
                "维修记录" to order.record,
            ),
        )
        DetailSection(
            title = "交付与保障",
            icon = BrandIconResource.Calendar,
            rows = listOf(
                "预计交车" to order.delivery,
                "保险到期" to order.insuranceExpiry,
            ),
        )
        DetailSection(
            title = "费用",
            icon = BrandIconResource.Wallet,
            rows = listOf("工单总额" to order.amountLabel),
        )
    }
}

@Composable
private fun DetailSection(
    title: String,
    icon: BrandIconResource,
    rows: List<Pair<String, String>>,
) {
    AutoserviceCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandIcon(
                resource = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = AutoserviceColors.InkMuted,
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = AutoserviceColors.Ink,
            )
        }
        rows.forEach { (label, value) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = AutoserviceSpacing.Md),
                horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    text = label,
                    modifier = Modifier.weight(0.38f),
                    style = MaterialTheme.typography.bodySmall,
                    color = AutoserviceColors.InkMuted,
                )
                Text(
                    text = value,
                    modifier = Modifier.weight(0.62f),
                    style = MaterialTheme.typography.bodyMedium,
                    color = AutoserviceColors.Ink,
                    fontWeight = if (label == "工单总额") FontWeight.SemiBold else FontWeight.Normal,
                    textAlign = TextAlign.End,
                )
            }
        }
    }
}

@Composable
private fun MissingOrderDetail(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(AutoserviceSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        BrandIcon(
            resource = BrandIconResource.Warning,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = AutoserviceColors.Warning,
        )
        Text(
            text = "工单不存在或已失效",
            style = MaterialTheme.typography.titleMedium,
            color = AutoserviceColors.Ink,
        )
        Text(
            text = "缓存数据已更新，请返回列表重新选择。",
            style = MaterialTheme.typography.bodySmall,
            color = AutoserviceColors.InkMuted,
            textAlign = TextAlign.Center,
        )
        BrandButton(
            onClick = onBack,
            tone = BrandButtonTone.SECONDARY,
        ) {
            Text("返回工单列表")
        }
    }
}
