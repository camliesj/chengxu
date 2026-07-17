package com.chengxu.autoservice.core.network

object ConnectionStateResolver {
    fun fromCapabilities(
        networkAvailable: Boolean,
        hasInternet: Boolean,
        isValidated: Boolean,
    ): ConnectionState = if (networkAvailable && hasInternet && isValidated) {
        ConnectionState.Online
    } else {
        ConnectionState.Offline
    }
}
