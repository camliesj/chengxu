package com.chengxu.autoservice.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
    const val COMPANY_TONGDA = "company-tongda"
    const val COMPANY_XINQIHENG = "company-xinqiheng"
}

private data class CompanyOption(
    val id: String,
    val name: String,
    val supportingText: String,
    val testTag: String,
)

private val companyOptions = listOf(
    CompanyOption(
        id = "tongda",
        name = "通达汽车服务中心",
        supportingText = "鄂尔多斯市通达汽车服务有限公司",
        testTag = LoginTestTags.COMPANY_TONGDA,
    ),
    CompanyOption(
        id = "xinqiheng",
        name = "鑫齐恒汽车服务中心",
        supportingText = "鄂尔多斯市鑫齐恒汽车服务有限公司",
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .testTag(LoginTestTags.ROOT),
    ) {
        LoginHero()
        Surface(
            modifier = Modifier
                .padding(horizontal = AutoserviceSpacing.Md)
                .offset(y = (-28).dp),
            shape = AutoservicePanelShape,
            color = AutoserviceColors.Surface,
            contentColor = AutoserviceColors.Ink,
        ) {
            Column(
                modifier = Modifier.padding(
                    horizontal = AutoserviceSpacing.Lg,
                    vertical = AutoserviceSpacing.Xl,
                ),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
            ) {
                Text(
                    text = "欢迎回来",
                    style = MaterialTheme.typography.labelMedium,
                    color = AutoserviceColors.InkMuted,
                )
                Text(
                    text = "登录维修业务移动端",
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    text = "选择企业并使用现有业务账号登录",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AutoserviceColors.InkMuted,
                )

                Spacer(Modifier.height(AutoserviceSpacing.Xs))
                Text(
                    text = "选择企业",
                    style = MaterialTheme.typography.labelLarge,
                )
                companyOptions.forEach { company ->
                    CompanySelectionCard(
                        companyName = company.name,
                        supportingText = company.supportingText,
                        selected = state.companyId == company.id,
                        enabled = !state.submitting,
                        onClick = { onCompanySelected(company.id) },
                        modifier = Modifier.fillMaxWidth().testTag(company.testTag),
                    )
                }

                Spacer(Modifier.height(AutoserviceSpacing.Xs))
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
                    modifier = Modifier.fillMaxWidth(),
                    loading = state.submitting,
                    enabled = !state.submitting,
                ) {
                    Text(if (state.submitting) "正在登录" else "进入系统")
                }

                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        BrandIcon(
                            resource = BrandIconResource.Shield,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = AutoserviceColors.InkMuted,
                        )
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
}

@Composable
private fun LoginHero() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(330.dp)
            .background(AutoserviceColors.Ice),
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(horizontal = 20.dp, vertical = 30.dp),
            verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        ) {
            Text(
                text = "AUTOSERVICE MOBILE",
                style = MaterialTheme.typography.labelSmall,
                color = AutoserviceColors.InkMuted,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "让每一次服务\n更从容",
                style = MaterialTheme.typography.headlineLarge,
            )
            Text(
                text = "门店业务与车辆服务协同入口",
                style = MaterialTheme.typography.bodyMedium,
                color = AutoserviceColors.InkMuted,
            )
        }
        Image(
            painter = painterResource(R.drawable.brand_login_service_vehicle),
            contentDescription = "现代汽车服务空间中的深灰色服务车辆",
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(154.dp)
                .padding(horizontal = AutoserviceSpacing.Lg),
            contentScale = ContentScale.Fit,
        )
    }
}
