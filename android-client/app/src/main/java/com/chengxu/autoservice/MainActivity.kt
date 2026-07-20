package com.chengxu.autoservice

import android.net.ConnectivityManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import com.chengxu.autoservice.core.auth.AuthFailure
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.EncryptedSessionStore
import com.chengxu.autoservice.core.auth.HttpUrlConnectionAuthApi
import com.chengxu.autoservice.core.auth.SharedPreferencesEncryptedValueStore
import com.chengxu.autoservice.core.auth.androidKeystoreSessionCipher
import com.chengxu.autoservice.core.network.AndroidConnectivityNetworkMonitor
import com.chengxu.autoservice.core.orders.CachedOrdersRepository
import com.chengxu.autoservice.core.orders.HttpUrlConnectionOrdersApi
import com.chengxu.autoservice.core.orders.SessionInvalidator
import com.chengxu.autoservice.core.orders.cache.AutoserviceDatabase
import com.chengxu.autoservice.core.orders.cache.RoomOrderCache

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val database = AutoserviceDatabase.create(applicationContext)
        val orderCache = RoomOrderCache(database.orderDao())
        val authenticationRepository = AuthenticationRepository(
            authApi = HttpUrlConnectionAuthApi(BuildConfig.API_ORIGIN),
            sessionStore = EncryptedSessionStore(
                valueStore = SharedPreferencesEncryptedValueStore(applicationContext),
                cipher = androidKeystoreSessionCipher(),
            ),
            authenticatedDataCleaner = orderCache,
        )
        val networkMonitor = AndroidConnectivityNetworkMonitor(
            connectivityManager = getSystemService(ConnectivityManager::class.java),
            applicationScope = lifecycleScope,
        )
        val ordersRepository = CachedOrdersRepository(
            applicationScope = lifecycleScope,
            sessionRepository = authenticationRepository,
            networkMonitor = networkMonitor,
            ordersApi = HttpUrlConnectionOrdersApi(BuildConfig.API_ORIGIN),
            orderCache = orderCache,
            sessionInvalidator = SessionInvalidator {
                authenticationRepository.invalidate(AuthFailure.SessionExpired)
            },
        )

        setContent {
            AutoserviceApp(
                authenticationRepository = authenticationRepository,
                networkMonitor = networkMonitor,
                ordersRepository = ordersRepository,
            )
        }
    }
}
