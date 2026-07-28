package com.chengxu.autoservice.ui.settlement

import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.*

@Composable fun SettlementScreen(state: SettlementUiState, onBack: () -> Unit, onReceipt: (SelectedReceipt) -> Unit, onPayment: (String) -> Unit, onDate: (String) -> Unit, onTime: (String) -> Unit, onRemark: (String) -> Unit, onSubmit: () -> Unit, onConfirmReverse: () -> Unit, onDismissReverse: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let {
        val type = context.contentResolver.getType(it).orEmpty(); val bytes = runCatching { context.contentResolver.openInputStream(it)?.use { stream -> stream.readBytes() } }.getOrNull()
        if (type in setOf("image/jpeg", "image/png", "image/webp") && bytes != null && bytes.size in 1..(12 * 1024 * 1024)) onReceipt(SelectedReceipt("到账回执", type, bytes))
    } }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(AutoserviceSpacing.Lg), verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md)) {
        Text(if (state.reversing) "返结算" else "办理结算", style = MaterialTheme.typography.headlineSmall)
        state.detail?.let { Text("工单 ${it.summary.id} · ${it.summary.plate}", color = AutoserviceColors.InkMuted) }
        if (!state.reversing) {
            BrandSegmentedFilter("现金", state.paymentMethod == "现金", { onPayment("现金") })
            BrandSegmentedFilter("微信", state.paymentMethod == "微信", { onPayment("微信") })
            BrandSegmentedFilter("支付宝", state.paymentMethod == "支付宝", { onPayment("支付宝") })
            BrandDateField(state.settlementDate, onDate, "结算日期")
            BrandTextField(state.settlementTime, onTime, "结算时间")
            BrandTextField(state.remark, onRemark, "结算备注")
            BrandButton(onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, tone = BrandButtonTone.SECONDARY, modifier = Modifier.fillMaxWidth()) { Text("从相册选择到账回执截图") }
            state.receipt?.let { selected ->
                Text("已选择：${selected.name} · ${selected.bytes.size / 1024} KB", color = AutoserviceColors.InkMuted)
                BitmapFactory.decodeByteArray(selected.bytes, 0, selected.bytes.size)?.let { Image(it.asImageBitmap(), "到账回执预览", Modifier.fillMaxWidth().heightIn(max = 280.dp)) }
            }
        } else Text("返结算将清空付款方式、结算日期/时间和备注，但保留到账回执。", color = AutoserviceColors.Warning)
        state.message?.let { Text(it, color = AutoserviceColors.Danger) }
        BrandButton(onClick = onSubmit, modifier = Modifier.fillMaxWidth(), enabled = !state.submitting && if (state.reversing) state.canReverse else state.canSettle && state.receipt != null, loading = state.submitting, tone = if (state.reversing) BrandButtonTone.DANGER else BrandButtonTone.PRIMARY) { Text(if (state.reversing) "返结算" else "确认结算") }
        BrandButton(onClick = onBack, modifier = Modifier.fillMaxWidth(), tone = BrandButtonTone.QUIET) { Text("返回") }
    }
    if (state.confirmReverse) AlertDialog(onDismissRequest = onDismissReverse, title = { Text("确认返结算？") }, text = { Text("付款信息会被清空，到账回执会保留。") }, confirmButton = { BrandButton(onClick = onConfirmReverse, tone = BrandButtonTone.DANGER) { Text("确认返结算") } }, dismissButton = { BrandButton(onClick = onDismissReverse, tone = BrandButtonTone.QUIET) { Text("取消") } })
}
