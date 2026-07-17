package com.chengxu.autoservice.core.network

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.stateIn

class AndroidConnectivityNetworkMonitor(
    private val connectivityManager: ConnectivityManager,
    applicationScope: CoroutineScope,
) : NetworkMonitor {
    private val initialState = connectivityManager.currentConnectionState()

    override val connection: StateFlow<ConnectionState> = callbackFlow {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: android.net.Network) {
                trySend(connectivityManager.currentConnectionState())
            }

            override fun onCapabilitiesChanged(
                network: android.net.Network,
                networkCapabilities: NetworkCapabilities,
            ) {
                trySend(
                    ConnectionStateResolver.fromCapabilities(
                        networkAvailable = true,
                        hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET),
                        isValidated = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
                    ),
                )
            }

            override fun onLost(network: android.net.Network) {
                trySend(ConnectionState.Offline)
            }

            override fun onUnavailable() {
                trySend(ConnectionState.Offline)
            }
        }

        connectivityManager.registerDefaultNetworkCallback(callback)
        awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
    }.stateIn(
        scope = applicationScope,
        started = SharingStarted.Eagerly,
        initialValue = initialState,
    )

    private fun ConnectivityManager.currentConnectionState(): ConnectionState {
        val network = activeNetwork ?: return ConnectionState.Offline
        val capabilities = getNetworkCapabilities(network) ?: return ConnectionState.Offline

        return ConnectionStateResolver.fromCapabilities(
            networkAvailable = true,
            hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET),
            isValidated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
        )
    }
}
