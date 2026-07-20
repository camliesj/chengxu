package com.chengxu.autoservice.core.auth

fun interface AuthenticatedDataCleaner {
    suspend fun clear()
}
