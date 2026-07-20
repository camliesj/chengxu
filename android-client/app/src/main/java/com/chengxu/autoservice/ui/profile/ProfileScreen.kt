package com.chengxu.autoservice.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceCard
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.designsystem.BrandConfirmDialog
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.designsystem.StatusChip
import com.chengxu.autoservice.core.designsystem.StatusTone
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.session.AppSession

@Composable
fun ProfileScreen(
    session: AppSession,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    offline: Boolean = false,
) {
    var showLogoutDialog by rememberSaveable { mutableStateOf(false) }
    val logoutFocusRequester = remember { FocusRequester() }
    val roleLabel = if (session.role == UserRole.ADMINISTRATOR) "管理员" else "员工"

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Xl),
        verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Lg),
    ) {
        Text(
            text = "我的",
            style = MaterialTheme.typography.headlineSmall,
            color = AutoserviceColors.Ink,
        )
        Text(
            text = "账户、企业与本机登录状态",
            style = MaterialTheme.typography.bodyMedium,
            color = AutoserviceColors.InkMuted,
        )

        AutoserviceCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
            ) {
                Surface(
                    shape = CircleShape,
                    color = AutoserviceColors.Ice,
                    contentColor = AutoserviceColors.Ink,
                ) {
                    BrandIcon(
                        resource = BrandIconResource.User,
                        contentDescription = null,
                        modifier = Modifier.padding(14.dp).size(28.dp),
                    )
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
                ) {
                    Text(
                        text = session.staffName,
                        style = MaterialTheme.typography.titleLarge,
                        color = AutoserviceColors.Ink,
                    )
                    Text(
                        text = session.companyName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = AutoserviceColors.InkMuted,
                    )
                }
                StatusChip(
                    text = roleLabel,
                    icon = BrandIconResource.Shield,
                    tone = StatusTone.SUCCESS,
                )
            }
        }

        ProfileDetailCard(
            icon = BrandIconResource.Building,
            title = "所属企业",
            value = session.companyName,
        )
        ProfileDetailCard(
            icon = if (offline) BrandIconResource.Offline else BrandIconResource.Refresh,
            title = "数据同步",
            value = "刚刚同步",
            supportingText = if (offline) "当前离线，恢复网络后将自动刷新" else "工作数据已是最新状态",
            tone = if (offline) AutoserviceColors.Warning else AutoserviceColors.Success,
        )
        ProfileDetailCard(
            icon = BrandIconResource.Lock,
            title = "账户安全",
            value = "登录状态已加密保存在本机",
            supportingText = "退出后将清除本机登录状态",
        )

        Spacer(modifier = Modifier.height(AutoserviceSpacing.Xs))
        BrandButton(
            onClick = { showLogoutDialog = true },
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(logoutFocusRequester),
            tone = BrandButtonTone.DANGER,
            icon = BrandIconResource.Logout,
        ) {
            Text("退出登录")
        }
    }

    if (showLogoutDialog) {
        BrandConfirmDialog(
            title = "确认退出登录",
            description = "退出后将清除本机加密登录状态，并返回登录页面。",
            cancelLabel = "暂不退出",
            confirmLabel = "退出登录",
            returnFocusRequester = logoutFocusRequester,
            onCancel = { showLogoutDialog = false },
            onConfirm = {
                showLogoutDialog = false
                onLogout()
            },
        )
    }
}

@Composable
private fun ProfileDetailCard(
    icon: BrandIconResource,
    title: String,
    value: String,
    supportingText: String? = null,
    tone: Color = AutoserviceColors.Ink,
) {
    AutoserviceCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
        ) {
            Surface(
                shape = CircleShape,
                color = AutoserviceColors.SurfaceSoft,
                contentColor = tone,
            ) {
                BrandIcon(
                    resource = icon,
                    contentDescription = null,
                    modifier = Modifier.padding(10.dp).size(20.dp),
                    tint = tone,
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = AutoserviceColors.InkMuted,
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleMedium,
                    color = AutoserviceColors.Ink,
                )
                supportingText?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = AutoserviceColors.InkMuted,
                    )
                }
            }
        }
    }
}
