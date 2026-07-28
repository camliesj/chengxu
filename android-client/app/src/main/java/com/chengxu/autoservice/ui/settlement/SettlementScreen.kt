package com.chengxu.autoservice.ui.settlement

import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.designsystem.BrandDateField
import com.chengxu.autoservice.core.designsystem.BrandSegmentedFilter
import com.chengxu.autoservice.core.designsystem.BrandTextField

@Composable
fun SettlementScreen(
    state: SettlementUiState,
    onBack: () -> Unit,
    onReceipt: (SelectedReceipt) -> Unit,
    onPayment: (String) -> Unit,
    onDate: (String) -> Unit,
    onTime: (String) -> Unit,
    onRemark: (String) -> Unit,
    onSubmit: () -> Unit,
    onViewReceipt: () -> Unit,
    onDeleteReceipt: () -> Unit,
    onConfirmReverse: () -> Unit,
    onDismissReverse: () -> Unit,
    onConfirmDelete: () -> Unit,
    onDismissDelete: () -> Unit,
) {
    val context = LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let {
            val type = context.contentResolver.getType(it).orEmpty()
            val bytes = runCatching { context.contentResolver.openInputStream(it)?.use { stream -> stream.readBytes() } }.getOrNull()
            if (type in setOf("image/jpeg", "image/png", "image/webp") && bytes != null && bytes.size in 1..(12 * 1024 * 1024)) {
                onReceipt(SelectedReceipt("到账回执", type, bytes))
            }
        }
    }
    val pickReceipt = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(AutoserviceSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
    ) {
        Text(
            when {
                state.reversing -> "返结算"
                state.isReceiptManagement -> "管理到账回执"
                else -> "办理结算"
            },
            style = MaterialTheme.typography.headlineSmall,
        )
        state.detail?.let { Text("工单 ${it.summary.id} · ${it.summary.plate}", color = AutoserviceColors.InkMuted) }

        when {
            state.reversing -> Text("返结算将清空付款方式、结算日期、时间和备注，但保留到账回执。", color = AutoserviceColors.Warning)
            state.isReceiptManagement -> ReceiptManagement(
                state = state,
                onPickReceipt = pickReceipt,
                onViewReceipt = onViewReceipt,
                onDeleteReceipt = onDeleteReceipt,
            )
            else -> SettlementForm(state, onPayment, onDate, onTime, onRemark, pickReceipt)
        }

        state.message?.let { Text(it, color = AutoserviceColors.Danger) }
        val enabled = !state.submitting && when {
            state.reversing -> state.canReverse
            state.isReceiptManagement -> state.canManageReceipt && state.receipt != null
            else -> state.canSettle && state.receipt != null
        }
        if (!state.isReceiptManagement || state.receipt != null) {
            BrandButton(
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth(),
                enabled = enabled,
                loading = state.submitting,
                tone = if (state.reversing) BrandButtonTone.DANGER else BrandButtonTone.PRIMARY,
            ) {
                Text(if (state.reversing) "确认返结算" else if (state.isReceiptManagement) "确认替换回执" else "确认结算")
            }
        }
        BrandButton(onClick = onBack, modifier = Modifier.fillMaxWidth(), tone = BrandButtonTone.QUIET) { Text("返回") }
    }

    if (state.confirmReverse) {
        AlertDialog(
            onDismissRequest = onDismissReverse,
            title = { Text("确认返结算？") },
            text = { Text("付款信息会被清空，到账回执会保留。") },
            confirmButton = { BrandButton(onClick = onConfirmReverse, tone = BrandButtonTone.DANGER) { Text("确认返结算") } },
            dismissButton = { BrandButton(onClick = onDismissReverse, tone = BrandButtonTone.QUIET) { Text("取消") } },
        )
    }
    if (state.confirmDelete) {
        AlertDialog(
            onDismissRequest = onDismissDelete,
            title = { Text("删除到账回执？") },
            text = { Text("删除后不可恢复，工单其他结算信息不受影响。") },
            confirmButton = { BrandButton(onClick = onConfirmDelete, tone = BrandButtonTone.DANGER) { Text("确认删除") } },
            dismissButton = { BrandButton(onClick = onDismissDelete, tone = BrandButtonTone.QUIET) { Text("取消") } },
        )
    }
}

@Composable
private fun SettlementForm(
    state: SettlementUiState,
    onPayment: (String) -> Unit,
    onDate: (String) -> Unit,
    onTime: (String) -> Unit,
    onRemark: (String) -> Unit,
    onPickReceipt: () -> Unit,
) {
    BrandSegmentedFilter("现金", state.paymentMethod == "现金", { onPayment("现金") })
    BrandSegmentedFilter("微信", state.paymentMethod == "微信", { onPayment("微信") })
    BrandSegmentedFilter("支付宝", state.paymentMethod == "支付宝", { onPayment("支付宝") })
    BrandDateField(state.settlementDate, onDate, "结算日期")
    BrandTextField(state.settlementTime, onTime, "结算时间")
    BrandTextField(state.remark, onRemark, "结算备注")
    ReceiptPicker(onPickReceipt)
    state.receipt?.let { ReceiptImage("已选择：${it.name} · ${it.bytes.size / 1024} KB", it.bytes) }
}

@Composable
private fun ReceiptManagement(
    state: SettlementUiState,
    onPickReceipt: () -> Unit,
    onViewReceipt: () -> Unit,
    onDeleteReceipt: () -> Unit,
) {
    val receipt = state.detail?.receipt
    AutoserviceCard(modifier = Modifier.fillMaxWidth()) {
        Text("当前回执", style = MaterialTheme.typography.titleMedium)
        Text(receipt?.name ?: "暂无到账回执", color = AutoserviceColors.InkMuted)
        receipt?.let { Text("${it.contentType} · ${it.sizeBytes / 1024} KB", color = AutoserviceColors.InkMuted) }
        if (state.canManageReceipt) {
            BrandButton(onClick = onViewReceipt, modifier = Modifier.fillMaxWidth().padding(top = AutoserviceSpacing.Sm), tone = BrandButtonTone.SECONDARY, enabled = !state.submitting) { Text("查看当前回执") }
            BrandButton(onClick = onDeleteReceipt, modifier = Modifier.fillMaxWidth().padding(top = AutoserviceSpacing.Sm), tone = BrandButtonTone.DANGER, enabled = !state.submitting) { Text("删除当前回执") }
        }
    }
    state.receiptPreview?.let { ReceiptImage("当前回执预览", it.bytes) }
    ReceiptPicker(onPickReceipt, label = "从相册选择新的回执截图")
    state.receipt?.let { ReceiptImage("待替换：${it.name} · ${it.bytes.size / 1024} KB", it.bytes) }
}

@Composable
private fun ReceiptPicker(onPickReceipt: () -> Unit, label: String = "从相册选择到账回执截图") {
    BrandButton(onClick = onPickReceipt, tone = BrandButtonTone.SECONDARY, modifier = Modifier.fillMaxWidth()) { Text(label) }
}

@Composable
private fun ReceiptImage(label: String, bytes: ByteArray) {
    AutoserviceCard(modifier = Modifier.fillMaxWidth()) {
        Text(label, color = AutoserviceColors.InkMuted)
        val bitmap by remember(bytes) { androidx.compose.runtime.mutableStateOf(BitmapFactory.decodeByteArray(bytes, 0, bytes.size)) }
        bitmap?.let { Image(it.asImageBitmap(), "到账回执预览", Modifier.fillMaxWidth().heightIn(max = 280.dp).padding(top = AutoserviceSpacing.Sm)) }
    }
}
