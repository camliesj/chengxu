package com.chengxu.autoservice

import android.content.Intent
import android.net.ConnectivityManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.AndroidConnectivityNetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.InMemorySessionRepository
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.ui.workbench.DemoWorkbenchRepository

class MainActivity : ComponentActivity() {
    internal lateinit var activeRoleForTesting: UserRole
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val role = resolveDemoRole(intent, BuildConfig.DEBUG)
        activeRoleForTesting = role
        val sessionRepository = InMemorySessionRepository(
            AppSession(
                companyName = "通达汽车服务中心",
                staffName = "张工",
                role = role,
                permissions = PermissionSnapshot.forRole(role),
            ),
        )
        val networkMonitor = AndroidConnectivityNetworkMonitor(
            connectivityManager = getSystemService(ConnectivityManager::class.java),
            applicationScope = lifecycleScope,
        )

        setContent {
            AutoserviceApp(
                sessionRepository = sessionRepository,
                networkMonitor = networkMonitor,
                workbenchRepository = DemoWorkbenchRepository(),
            )
        }
    }
}

internal fun resolveDemoRole(intent: Intent, debug: Boolean): UserRole {
    if (!debug) return UserRole.EMPLOYEE
    return when (intent.getStringExtra("demo_role")) {
        "admin" -> UserRole.ADMINISTRATOR
        else -> UserRole.EMPLOYEE
    }
}
