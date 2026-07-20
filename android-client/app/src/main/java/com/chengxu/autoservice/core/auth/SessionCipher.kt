package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.security.AesGcmStringCipher
import com.chengxu.autoservice.core.security.StringCipher
import com.chengxu.autoservice.core.security.androidKeystoreStringCipher
import javax.crypto.SecretKey

interface SessionCipher {
    fun encrypt(plaintext: String): String
    fun decrypt(ciphertext: String): String
}

class AesGcmSessionCipher(
    keyProvider: () -> SecretKey,
) : SessionCipher by SessionCipherAdapter(AesGcmStringCipher(keyProvider))

fun androidKeystoreSessionCipher(alias: String = "autoservice_auth_session"): SessionCipher =
    SessionCipherAdapter(androidKeystoreStringCipher(alias))

private class SessionCipherAdapter(
    private val delegate: StringCipher,
) : SessionCipher {
    override fun encrypt(plaintext: String): String = delegate.encrypt(plaintext)
    override fun decrypt(ciphertext: String): String = delegate.decrypt(ciphertext)
}
