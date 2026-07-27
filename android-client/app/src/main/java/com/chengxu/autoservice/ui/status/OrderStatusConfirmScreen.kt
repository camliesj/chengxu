package com.chengxu.autoservice.ui.status

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoservicePanelShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.network.ConnectionState

object OrderStatusTestTags {
    const val CANCEL = "status_change_cancel"
    const val CONFIRM = "status_change_confirm"
}

@Composable
fun OrderStatusConfirmScreen(
    state: OrderStatusUiState,
    onBack: () -> Unit,
    onConfirm: () -> Unit,
    onConfirmUnknown: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val detail = state.detail
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .imePadding()
            .padding(AutoserviceSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        Text("确认更新工单状态", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("该操作将立即同步到服务端，请核对后确认。", color = AutoserviceColors.InkMuted, style = MaterialTheme.typography.bodyMedium)
        when {
            state.loading -> LoadingStatus()
            detail == null || state.targetStatus == null -> Text("无法加载状态更新信息", color = AutoserviceColors.Danger)
            state.completedOrderId != null -> CompletedStatus(detail.summary.id)
            else -> StatusReviewCard(state)
        }
        state.message?.let { Text(it, color = AutoserviceColors.Danger, style = MaterialTheme.typography.bodySmall) }
        androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        ) {
            BrandButton(
                onClick = onBack,
                modifier = Modifier.weight(1f).testTag(OrderStatusTestTags.CANCEL),
                tone = BrandButtonTone.SECONDARY,
                enabled = state.submitState != StatusSubmitState.SUBMITTING,
            ) { Text(if (state.completedOrderId != null) "返回工单详情" else "取消") }
            BrandButton(
                onClick = if (state.submitState == StatusSubmitState.CONFIRMING) onConfirmUnknown else onConfirm,
                modifier = Modifier.weight(1.4f).testTag(OrderStatusTestTags.CONFIRM),
                enabled = state.completedOrderId == null && state.detail != null && state.targetStatus != null &&
                    state.connection == ConnectionState.Online &&
                    (state.canSubmit || state.submitState == StatusSubmitState.CONFIRMING) &&
                    state.submitState != StatusSubmitState.SUBMITTING,
                loading = state.submitState == StatusSubmitState.SUBMITTING,
            ) {
                Text(if (state.submitState == StatusSubmitState.CONFIRMING) "确认提交结果" else "确认更新")
            }
        }
    }
}

@Composable
private fun StatusReviewCard(state: OrderStatusUiState) {
    val detail = requireNotNull(state.detail)
    val target = requireNotNull(state.targetStatus)
    Surface(shape = AutoservicePanelShape, color = AutoserviceColors.Surface) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
        ) {
            Text(detail.summary.id, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(detail.summary.plate, style = MaterialTheme.typography.headlineSmall, color = AutoserviceColors.Ink)
            StatusRow("当前状态", detail.summary.status)
            StatusRow("目标状态", target.wireValue)
            Text("影响说明", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Text(
                "更新后，工单列表、详情和其他已登录设备会以服务端最新状态为准。网络中断后将保留待确认记录，不会自动重复提交。",
                style = MaterialTheme.typography.bodySmall,
                color = AutoserviceColors.InkMuted,
            )
        }
    }
}

@Composable
private fun StatusRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = AutoserviceColors.InkMuted)
        Text(value, color = AutoserviceColors.Ink, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun LoadingStatus() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        CircularProgressIndicator(color = AutoserviceColors.Action)
        Text("正在加载工单信息", color = AutoserviceColors.InkMuted)
    }
}

@Composable
private fun CompletedStatus(orderId: String) {
    Surface(shape = AutoservicePanelShape, color = AutoserviceColors.Ice) {
        Column(modifier = Modifier.fillMaxWidth().padding(AutoserviceSpacing.Lg)) {
            Text("状态已更新", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text("工单 $orderId 已同步最新状态。", color = AutoserviceColors.InkMuted)
        }
    }
}
