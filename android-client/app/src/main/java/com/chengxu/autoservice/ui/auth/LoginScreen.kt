package com.chengxu.autoservice.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.R
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoservicePanelShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.designsystem.BrandTextField
import com.chengxu.autoservice.core.designsystem.CompanySelectionCard

object LoginTestTags {
    const val ROOT = "brand-login-root"
    const val HERO = "brand-login-hero"
    const val FORM_PANEL = "brand-login-form-panel"
    const val COMPANY_TONGDA = "company-tongda"
    const val COMPANY_XINQIHENG = "company-xinqiheng"
    const val PRIMARY_ACTION = "brand-login-primary-action"
    const val SECURITY_NOTE = "brand-login-security-note"
}

private data class CompanyOption(
    val id: String,
    val name: String,
    val testTag: String,
)

private val companyOptions = listOf(
    CompanyOption(
        id = "tongda",
        name = "通达汽车服务中心",
        testTag = LoginTestTags.COMPANY_TONGDA,
    ),
    CompanyOption(
        id = "xinqiheng",
        name = "鑫齐恒汽车服务中心",
        testTag = LoginTestTags.COMPANY_XINQIHENG,
    ),
)

@Composable
fun LoginScreen(
    state: LoginUiState,
    onCompanySelected: (String) -> Unit,
    onUsernameChanged: (String) -> Unit,
    onPasswordChanged: (String) -> Unit,
    onLogin: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    val density = LocalDensity.current
    val layoutSpec = loginLayoutSpec(
        imeVisible = WindowInsets.ime.getBottom(density) > 0,
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .testTag(LoginTestTags.ROOT),
    ) {
        LoginHero(layoutSpec)
        Surface(
            modifier = Modifier
                .padding(horizontal = AutoserviceSpacing.Md)
                .offset(y = -layoutSpec.panelOverlap)
                .testTag(LoginTestTags.FORM_PANEL),
            shape = AutoservicePanelShape,
            color = AutoserviceColors.Surface,
            contentColor = AutoserviceColors.Ink,
        ) {
            Column(
                modifier = Modifier.padding(AutoserviceSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
            ) {
                Text(
                    text = "登录维修业务移动端",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = "选择企业并使用业务账号登录",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AutoserviceColors.InkMuted,
                )

                Text(
                    text = "选择企业",
                    style = MaterialTheme.typography.labelLarge,
                )
                companyOptions.forEach { company ->
                    CompanySelectionCard(
                        companyName = company.name,
                        selected = state.companyId == company.id,
                        enabled = !state.submitting,
                        onClick = { onCompanySelected(company.id) },
                        modifier = Modifier.fillMaxWidth().testTag(company.testTag),
                        compact = true,
                    )
                }

                BrandTextField(
                    value = state.username,
                    onValueChange = onUsernameChanged,
                    label = "账号",
                    leadingIcon = BrandIconResource.User,
                    enabled = !state.submitting,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next,
                    ),
                )
                BrandTextField(
                    value = state.password,
                    onValueChange = onPasswordChanged,
                    label = "密码",
                    leadingIcon = BrandIconResource.Lock,
                    enabled = !state.submitting,
                    visualTransformation = if (passwordVisible) {
                        VisualTransformation.None
                    } else {
                        PasswordVisualTransformation()
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(onDone = { onLogin() }),
                    trailingContent = {
                        IconButton(
                            onClick = { passwordVisible = !passwordVisible },
                            enabled = !state.submitting,
                        ) {
                            BrandIcon(
                                resource = if (passwordVisible) {
                                    BrandIconResource.EyeOff
                                } else {
                                    BrandIconResource.Eye
                                },
                                contentDescription = if (passwordVisible) "隐藏密码" else "显示密码",
                                tint = AutoserviceColors.InkMuted,
                            )
                        }
                    },
                )

                state.errorMessage?.let { message ->
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodySmall,
                        color = AutoserviceColors.Danger,
                    )
                }

                BrandButton(
                    onClick = onLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag(LoginTestTags.PRIMARY_ACTION),
                    loading = state.submitting,
                    enabled = !state.submitting,
                ) {
                    Text(if (state.submitting) "正在登录" else "进入系统")
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag(LoginTestTags.SECURITY_NOTE),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    BrandIcon(
                        resource = BrandIconResource.Shield,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = AutoserviceColors.InkMuted,
                    )
                    Spacer(Modifier.width(AutoserviceSpacing.Sm))
                    Text(
                        text = "账号凭据将通过安全连接提交",
                        style = MaterialTheme.typography.bodySmall,
                        color = AutoserviceColors.InkMuted,
                    )
                }
            }
        }
    }
}

@Composable
private fun LoginHero(layoutSpec: LoginLayoutSpec) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(layoutSpec.heroHeight)
            .background(AutoserviceColors.Ice)
            .testTag(LoginTestTags.HERO),
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(horizontal = 20.dp, vertical = AutoserviceSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
        ) {
            Text(
                text = "AUTOSERVICE MOBILE",
                style = MaterialTheme.typography.labelSmall,
                color = AutoserviceColors.InkMuted,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = if (layoutSpec.showMarketingTitle) {
                    "让每一次服务\n更从容"
                } else {
                    "登录维修业务移动端"
                },
                style = if (layoutSpec.showMarketingTitle) {
                    MaterialTheme.typography.headlineMedium
                } else {
                    MaterialTheme.typography.titleMedium
                },
            )
        }
        if (layoutSpec.showVehicle) {
            Image(
                painter = painterResource(R.drawable.brand_login_service_vehicle),
                contentDescription = "现代汽车服务空间中的深灰色服务车辆",
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(104.dp)
                    .padding(horizontal = 20.dp),
                contentScale = ContentScale.Fit,
            )
        }
    }
}
