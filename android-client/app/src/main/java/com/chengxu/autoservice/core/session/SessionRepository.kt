package com.chengxu.autoservice.core.session

import kotlinx.coroutines.flow.StateFlow

interface SessionRepository {
    val session: StateFlow<AppSession>
}
