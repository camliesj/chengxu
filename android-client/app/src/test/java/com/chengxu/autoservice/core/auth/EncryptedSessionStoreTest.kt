package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.security.AesGcmStringCipher
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Base64
import javax.crypto.spec.SecretKeySpec

class EncryptedSessionStoreTest {
    private val encryptionKey = SecretKeySpec(ByteArray(32) { it.toByte() }, "AES")

    @Test
    fun writeStoresCiphertextAndReadRestoresTheSession() = runTest {
        val values = FakeEncryptedValueStore()
        val store = EncryptedSessionStore(
            valueStore = values,
            cipher = AesGcmSessionCipher(keyProvider = { encryptionKey }),
            currentTimeMillis = { 1_000L },
        )
        val session = employeeSession()

        store.write(session)

        val persisted = requireNotNull(values.value)
        assertFalse(persisted.contains(session.token))
        assertFalse(persisted.contains("password", ignoreCase = true))
        assertEquals(session, store.read())
    }

    @Test
    fun expiredPayloadIsClearedInsteadOfRestored() = runTest {
        var now = 1_000L
        val values = FakeEncryptedValueStore()
        val store = EncryptedSessionStore(
            valueStore = values,
            cipher = AesGcmSessionCipher(keyProvider = { encryptionKey }),
            currentTimeMillis = { now },
            lifetimeMillis = 12 * 60 * 60 * 1_000L,
        )
        store.write(employeeSession())

        now += 12 * 60 * 60 * 1_000L

        assertNull(store.read())
        assertNull(values.value)
    }

    @Test
    fun corruptCiphertextIsClearedInsteadOfRestored() = runTest {
        val values = FakeEncryptedValueStore().apply { value = "not-valid-base64" }
        val store = EncryptedSessionStore(
            valueStore = values,
            cipher = AesGcmSessionCipher(keyProvider = { encryptionKey }),
        )

        assertNull(store.read())
        assertNull(values.value)
    }

    @Test
    fun sessionAdapterAndSharedCipherRemainCiphertextCompatible() {
        val sessionCipher = AesGcmSessionCipher(keyProvider = { encryptionKey })
        val sharedCipher = AesGcmStringCipher(keyProvider = { encryptionKey })

        val first = sessionCipher.encrypt("token-123")
        val second = sharedCipher.encrypt("token-123")

        assertTrue(Base64.getDecoder().decode(first).size > 12)
        assertFalse(first == second)
        assertEquals("token-123", sharedCipher.decrypt(first))
        assertEquals("token-123", sessionCipher.decrypt(second))
    }

    private fun employeeSession() = AppSession(
        companyId = "tongda",
        companyName = "通达汽车服务中心",
        username = "worker",
        staffName = "通达员工",
        token = "token-123",
        role = UserRole.EMPLOYEE,
        permissions = PermissionSnapshot.fromGranted(
            setOf(AppPermission.VIEW_ORDER, AppPermission.CREATE_ORDER),
        ),
    )

    private class FakeEncryptedValueStore : EncryptedValueStore {
        var value: String? = null

        override fun read(): String? = value
        override fun write(value: String) { this.value = value }
        override fun clear() { value = null }
    }
}
