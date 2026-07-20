package com.chengxu.autoservice.core.auth

fun interface AuthenticatedDataCleaner {
    suspend fun clear()
}

class CompositeAuthenticatedDataCleaner(
    private val cleaners: List<AuthenticatedDataCleaner>,
) : AuthenticatedDataCleaner {
    override suspend fun clear() {
        cleaners.forEach { cleaner -> cleaner.clear() }
    }
}
