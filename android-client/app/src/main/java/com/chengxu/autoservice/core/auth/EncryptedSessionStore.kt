package com.chengxu.autoservice.core.auth

import android.content.Context
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

interface EncryptedValueStore {
    fun read(): String?
    fun write(value: String)
    fun clear()
}

class SharedPreferencesEncryptedValueStore(context: Context) : EncryptedValueStore {
    private val preferences = context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    override fun read(): String? = preferences.getString(SESSION_KEY, null)
    override fun write(value: String) { preferences.edit().putString(SESSION_KEY, value).apply() }
    override fun clear() { preferences.edit().remove(SESSION_KEY).apply() }

    private companion object {
        const val FILE_NAME = "autoservice_encrypted_session"
        const val SESSION_KEY = "session"
    }
}

class EncryptedSessionStore(
    private val valueStore: EncryptedValueStore,
    private val cipher: SessionCipher,
    private val currentTimeMillis: () -> Long = System::currentTimeMillis,
    private val lifetimeMillis: Long = 12 * 60 * 60 * 1_000L,
    private val json: Json = Json { ignoreUnknownKeys = true },
) : SessionStore {
    override suspend fun read(): AppSession? {
        val encrypted = valueStore.read() ?: return null
        return runCatching {
            val payload = json.decodeFromString<PersistedSession>(cipher.decrypt(encrypted))
            if (payload.expiresAtMillis <= currentTimeMillis()) {
                valueStore.clear()
                null
            } else {
                payload.toAppSession()
            }
        }.getOrElse {
            valueStore.clear()
            null
        }
    }

    override suspend fun write(session: AppSession) {
        val payload = PersistedSession.from(session, currentTimeMillis() + lifetimeMillis)
        valueStore.write(cipher.encrypt(json.encodeToString(payload)))
    }

    override suspend fun clear() = valueStore.clear()
}

@Serializable
private data class PersistedSession(
    val companyId: String,
    val companyName: String,
    val username: String,
    val staffName: String,
    val token: String,
    val role: String,
    val permissions: List<String>,
    val expiresAtMillis: Long,
) {
    fun toAppSession(): AppSession = AppSession(
        companyId = companyId,
        companyName = companyName,
        username = username,
        staffName = staffName,
        token = token,
        role = UserRole.valueOf(role),
        permissions = PermissionSnapshot.fromGranted(
            permissions.mapNotNull { name -> AppPermission.entries.firstOrNull { it.name == name } }.toSet(),
        ),
    )

    companion object {
        fun from(session: AppSession, expiresAtMillis: Long) = PersistedSession(
            companyId = session.companyId,
            companyName = session.companyName,
            username = session.username,
            staffName = session.staffName,
            token = session.token,
            role = session.role.name,
            permissions = session.permissions.grantedPermissions().map(AppPermission::name),
            expiresAtMillis = expiresAtMillis,
        )
    }
}
