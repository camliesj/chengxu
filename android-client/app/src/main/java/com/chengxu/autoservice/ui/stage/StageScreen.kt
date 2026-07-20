package com.chengxu.autoservice.ui.stage

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.R
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.designsystem.StatusChip
import com.chengxu.autoservice.core.designsystem.StatusTone
import kotlinx.coroutines.launch

enum class StageKind(
    val title: String,
    val phase: String,
    val description: String,
    val actionLabel: String,
) {
    CREATE(
        title = "新增工单即将接入",
        phase = "阶段功能 · 暂未开放",
        description = "真实业务表单将在后续阶段实现，当前页面不会伪造写入结果。",
        actionLabel = "查看字段规划",
    ),
    RECORDS(
        title = "客户档案正在整理",
        phase = "视觉壳层 · 待接真实数据",
        description = "后续将统一客户、车辆、保险与历史结算记录。",
        actionLabel = "查看档案范围",
    ),
}

@Composable
fun StageScreen(
    kind: StageKind,
    offline: Boolean,
    modifier: Modifier = Modifier,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Column(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = AutoserviceSpacing.Lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            StatusChip(
                text = if (offline) "只读模式" else kind.phase,
                icon = if (offline) BrandIconResource.Offline else BrandIconResource.Tools,
                tone = if (offline) StatusTone.WARNING else StatusTone.PRIMARY,
            )
            Image(
                painter = painterResource(R.drawable.brand_empty_service_tools),
                contentDescription = "车辆维修工具车、扭力扳手与汽车模型",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .padding(vertical = AutoserviceSpacing.Lg),
                contentScale = ContentScale.Fit,
            )
            Text(
                text = kind.title,
                style = MaterialTheme.typography.headlineSmall,
                color = AutoserviceColors.Ink,
                textAlign = TextAlign.Center,
            )
            Text(
                text = kind.description,
                modifier = Modifier.padding(top = AutoserviceSpacing.Sm),
                style = MaterialTheme.typography.bodyMedium,
                color = AutoserviceColors.InkMuted,
                textAlign = TextAlign.Center,
            )
            BrandButton(
                onClick = { scope.launch { snackbarHostState.showSnackbar(kind.description) } },
                modifier = Modifier.padding(top = AutoserviceSpacing.Xl),
                tone = BrandButtonTone.SECONDARY,
                enabled = !(offline && kind == StageKind.CREATE),
            ) {
                Text(kind.actionLabel)
            }
        }
        SnackbarHost(hostState = snackbarHostState)
    }
}
