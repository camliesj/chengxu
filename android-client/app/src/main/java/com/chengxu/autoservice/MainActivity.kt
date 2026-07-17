package com.chengxu.autoservice

import android.net.ConnectivityManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.EncryptedSessionStore
import com.chengxu.autoservice.core.auth.HttpUrlConnectionAuthApi
import com.chengxu.autoservice.core.auth.SharedPreferencesEncryptedValueStore
import com.chengxu.autoservice.core.auth.androidKeystoreSessionCipher
import com.chengxu.autoservice.core.network.AndroidConnectivityNetworkMonitor
import com.chengxu.autoservice.ui.workbench.DemoWorkbenchRepository

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val authenticationRepository = AuthenticationRepository(
            authApi = HttpUrlConnectionAuthApi(BuildConfig.API_ORIGIN),
            sessionStore = EncryptedSessionStore(
                valueStore = SharedPreferencesEncryptedValueStore(applicationContext),
                cipher = androidKeystoreSessionCipher(),
            ),
        )
        val networkMonitor = AndroidConnectivityNetworkMonitor(
            connectivityManager = getSystemService(ConnectivityManager::class.java),
            applicationScope = lifecycleScope,
        )

        setContent {
            AutoserviceApp(
                authenticationRepository = authenticationRepository,
                networkMonitor = networkMonitor,
                workbenchRepository = DemoWorkbenchRepository(),
            )
        }
    }
}
