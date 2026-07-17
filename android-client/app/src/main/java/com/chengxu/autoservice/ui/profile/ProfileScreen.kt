package com.chengxu.autoservice.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.session.AppSession

@Composable
fun ProfileScreen(session: AppSession, onLogout: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("我的", style = MaterialTheme.typography.headlineSmall)
        Text(session.staffName, style = MaterialTheme.typography.titleLarge)
        Text(session.companyName, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(if (session.role == UserRole.ADMINISTRATOR) "管理员" else "员工")
        Button(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("退出登录") }
    }
}
