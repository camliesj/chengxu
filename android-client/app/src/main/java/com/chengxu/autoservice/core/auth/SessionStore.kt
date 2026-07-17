package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.session.AppSession

interface SessionStore {
    suspend fun read(): AppSession?

    suspend fun write(session: AppSession)

    suspend fun clear()
}
