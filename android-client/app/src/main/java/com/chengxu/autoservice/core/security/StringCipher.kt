package com.chengxu.autoservice.core.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

const val DEFAULT_ORDER_FIELDS_KEY_ALIAS = "autoservice_order_fields_v1"

interface StringCipher {
    fun encrypt(plaintext: String): String
    fun decrypt(ciphertext: String): String
}

class InvalidCiphertextException(cause: Throwable? = null) :
    IllegalArgumentException("Encrypted payload is invalid", cause)

class AesGcmStringCipher(
    private val keyProvider: () -> SecretKey,
) : StringCipher {
    override fun encrypt(plaintext: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.ENCRYPT_MODE, keyProvider())
        }
        val iv = cipher.iv
        require(iv.size == IV_SIZE_BYTES) { "AES-GCM provider returned an invalid IV" }
        val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(iv + encrypted)
    }

    override fun decrypt(ciphertext: String): String = try {
        val payload = Base64.getDecoder().decode(ciphertext)
        if (payload.size <= IV_SIZE_BYTES) throw InvalidCiphertextException()
        val iv = payload.copyOfRange(0, IV_SIZE_BYTES)
        val encrypted = payload.copyOfRange(IV_SIZE_BYTES, payload.size)
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.DECRYPT_MODE, keyProvider(), GCMParameterSpec(TAG_SIZE_BITS, iv))
        }
        cipher.doFinal(encrypted).toString(Charsets.UTF_8)
    } catch (invalid: InvalidCiphertextException) {
        throw invalid
    } catch (failure: IllegalArgumentException) {
        throw InvalidCiphertextException(failure)
    } catch (failure: GeneralSecurityException) {
        throw InvalidCiphertextException(failure)
    }

    private companion object {
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_SIZE_BYTES = 12
        const val TAG_SIZE_BITS = 128
    }
}

fun androidKeystoreStringCipher(
    alias: String = DEFAULT_ORDER_FIELDS_KEY_ALIAS,
): StringCipher = AesGcmStringCipher { getOrCreateAndroidKeystoreAesKey(alias) }

private fun getOrCreateAndroidKeystoreAesKey(alias: String): SecretKey {
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (keyStore.getKey(alias, null) as? SecretKey)?.let { return it }

    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
        init(
            KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        generateKey()
    }
}
