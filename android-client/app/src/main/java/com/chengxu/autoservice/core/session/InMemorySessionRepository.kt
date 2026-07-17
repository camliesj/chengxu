package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.UserRole
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class InMemorySessionRepository(initial: AppSession) : SessionRepository {
    private val mutableSession = MutableStateFlow(initial)

    override val session: StateFlow<AppSession?> = mutableSession.asStateFlow()

    fun setDebugRole(role: UserRole) {
        mutableSession.update {
            it.copy(
                role = role,
                permissions = PermissionSnapshot.forRole(role),
            )
        }
    }
}
