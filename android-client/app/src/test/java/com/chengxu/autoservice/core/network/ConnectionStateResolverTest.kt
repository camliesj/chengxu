package com.chengxu.autoservice.core.network

import org.junit.Assert.assertEquals
import org.junit.Test

class ConnectionStateResolverTest {
    @Test
    fun unvalidatedInternetNetworkRemainsOffline() {
        assertEquals(
            ConnectionState.Offline,
            ConnectionStateResolver.fromCapabilities(
                networkAvailable = true,
                hasInternet = true,
                isValidated = false,
            ),
        )
    }

    @Test
    fun validatedInternetNetworkIsOnline() {
        assertEquals(
            ConnectionState.Online,
            ConnectionStateResolver.fromCapabilities(
                networkAvailable = true,
                hasInternet = true,
                isValidated = true,
            ),
        )
    }
}
