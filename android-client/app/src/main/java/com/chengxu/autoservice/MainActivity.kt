package com.chengxu.autoservice

import android.net.ConnectivityManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import com.chengxu.autoservice.core.auth.AuthFailure
import com.chengxu.autoservice.core.auth.AuthenticatedDataCleaner
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.CompositeAuthenticatedDataCleaner
import com.chengxu.autoservice.core.auth.EncryptedSessionStore
import com.chengxu.autoservice.core.auth.HttpUrlConnectionAuthApi
import com.chengxu.autoservice.core.auth.SharedPreferencesEncryptedValueStore
import com.chengxu.autoservice.core.auth.androidKeystoreSessionCipher
import com.chengxu.autoservice.core.network.AndroidConnectivityNetworkMonitor
import com.chengxu.autoservice.core.orders.CachedOrdersRepository
import com.chengxu.autoservice.core.orders.HttpUrlConnectionOrdersApi
import com.chengxu.autoservice.core.orders.SessionInvalidator
import com.chengxu.autoservice.core.orders.cache.AutoserviceDatabase
import com.chengxu.autoservice.core.orders.cache.EncryptedOrderStore
import com.chengxu.autoservice.core.orders.cache.RoomOrderCache
import com.chengxu.autoservice.core.security.DEFAULT_ORDER_FIELDS_KEY_ALIAS
import com.chengxu.autoservice.core.security.androidKeystoreStringCipher

class MainActivity : ComponentActivity() {
    private lateinit var encryptedOrderStore: EncryptedOrderStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val database = AutoserviceDatabase.create(applicationContext)
        val orderCache = RoomOrderCache(database.orderDao())
        encryptedOrderStore = EncryptedOrderStore(
            dao = database.foundationDao(),
            cipher = androidKeystoreStringCipher(DEFAULT_ORDER_FIELDS_KEY_ALIAS),
        )
        val authenticationRepository = AuthenticationRepository(
            authApi = HttpUrlConnectionAuthApi(BuildConfig.API_ORIGIN),
            sessionStore = EncryptedSessionStore(
                valueStore = SharedPreferencesEncryptedValueStore(applicationContext),
                cipher = androidKeystoreSessionCipher(),
            ),
            authenticatedDataCleaner = CompositeAuthenticatedDataCleaner(
                listOf(
                    orderCache,
                    AuthenticatedDataCleaner { database.foundationDao().clearAllFoundation() },
                ),
            ),
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
