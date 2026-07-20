package com.chengxu.autoservice.core.security

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import java.security.KeyStore
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidKeystoreStringCipherTest {
    @Test
    fun samePlaintextUsesDifferentIvAndRoundTrips() = withCipher { cipher ->
        val first = cipher.encrypt("15000000000")
        val second = cipher.encrypt("15000000000")

        assertNotEquals(first, second)
        assertEquals("15000000000", cipher.decrypt(first))
        assertEquals("15000000000", cipher.decrypt(second))
    }

    @Test
    fun emptyStringRoundTrips() = withCipher { cipher ->
        assertEquals("", cipher.decrypt(cipher.encrypt("")))
    }

    @Test
    fun corruptCiphertextThrowsControlledException() = withCipher { cipher ->
        try {
            cipher.decrypt("not-valid-base64")
            fail("Expected invalid ciphertext")
        } catch (_: InvalidCiphertextException) {
            // Expected.
        }
    }

    private fun withCipher(assertions: (StringCipher) -> Unit) {
        val alias = "autoservice_field_test_${UUID.randomUUID()}"
        try {
            assertions(androidKeystoreStringCipher(alias))
        } finally {
            KeyStore.getInstance("AndroidKeyStore").apply {
                load(null)
                deleteEntry(alias)
            }
        }
    }
}
