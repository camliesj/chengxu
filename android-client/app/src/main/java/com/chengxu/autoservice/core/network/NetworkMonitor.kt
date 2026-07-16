package com.chengxu.autoservice.core.network

import kotlinx.coroutines.flow.StateFlow

interface NetworkMonitor {
    val connection: StateFlow<ConnectionState>
}
