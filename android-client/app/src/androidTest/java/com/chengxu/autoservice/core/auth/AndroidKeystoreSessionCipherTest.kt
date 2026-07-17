package com.chengxu.autoservice.core.auth

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.security.KeyStore
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidKeystoreSessionCipherTest {
    @Test
    fun providerGeneratedIvEncryptsAndDecryptsWithAndroidKeystore() {
        val alias = "autoservice_session_test_${UUID.randomUUID()}"
        try {
            val cipher = androidKeystoreSessionCipher(alias)
            val first = cipher.encrypt("session-token")
            val second = cipher.encrypt("session-token")

            assertNotEquals(first, second)
            assertEquals("session-token", cipher.decrypt(first))
            assertEquals("session-token", cipher.decrypt(second))
        } finally {
            KeyStore.getInstance("AndroidKeyStore").apply {
                load(null)
                deleteEntry(alias)
            }
        }
    }
}
