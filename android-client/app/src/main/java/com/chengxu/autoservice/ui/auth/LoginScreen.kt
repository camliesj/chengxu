package com.chengxu.autoservice.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

private data class CompanyOption(val id: String, val label: String)

private val companyOptions = listOf(
    CompanyOption("tongda", "通达汽车服务中心"),
    CompanyOption("xinqiheng", "鑫齐恒汽车服务中心"),
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
    Column(
        modifier = modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 40.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("汽修接待", style = MaterialTheme.typography.headlineMedium)
        Text("使用公司账号登录", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(24.dp))
        CompanyDropdown(
            selectedCompanyId = state.companyId,
            enabled = !state.submitting,
            onCompanySelected = onCompanySelected,
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = state.username,
            onValueChange = onUsernameChanged,
            label = { Text("账号") },
            singleLine = true,
            enabled = !state.submitting,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChanged,
            label = { Text("密码") },
            singleLine = true,
            enabled = !state.submitting,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        state.errorMessage?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = onLogin,
            enabled = !state.submitting,
            modifier = Modifier.fillMaxWidth().align(Alignment.CenterHorizontally),
        ) {
            Text(if (state.submitting) "登录中…" else "登录")
        }
    }
}

@Composable
private fun CompanyDropdown(
    selectedCompanyId: String,
    enabled: Boolean,
    onCompanySelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = companyOptions.first { it.id == selectedCompanyId }

    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedButton(
            onClick = { expanded = true },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("公司", style = MaterialTheme.typography.labelSmall)
                Text(selected.label)
            }
            Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = "选择公司")
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.88f),
        ) {
            companyOptions.forEach { company ->
                DropdownMenuItem(
                    text = { Text(company.label) },
                    onClick = {
                        onCompanySelected(company.id)
                        expanded = false
                    },
                )
            }
        }
    }
}
