package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.session.AppSession
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationRepositoryTest {
    @Test
    fun successfulLoginPersistsMappedSessionAndPublishesAuthenticatedState() = runTest {
        val store = FakeSessionStore()
        val repository = AuthenticationRepository(
            authApi = FakeAuthApi(AuthResult.Success(remoteSession())),
            sessionStore = store,
        )

        repository.login(AuthCredentials("tongda", "worker", "secret12"))

        val state = repository.state.value as AuthenticationState.Authenticated
        assertEquals("worker", state.session.username)
        assertEquals(UserRole.EMPLOYEE, state.session.role)
        assertEquals(state.session, store.value)
        assertEquals(state.session, repository.session.value)
    }

    @Test
    fun storageFailureAfterRemoteLoginReturnsUnauthenticatedWithoutPublishingSession() = runTest {
        val repository = AuthenticationRepository(
            authApi = FakeAuthApi(AuthResult.Success(remoteSession())),
            sessionStore = object : SessionStore {
                override suspend fun read(): AppSession? = null

                override suspend fun write(session: AppSession) =
                    throw IllegalStateException("storage failed")

                override suspend fun clear() = Unit
            },
        )

        repository.login(AuthCredentials("tongda", "worker", "secret12"))

        assertNull(repository.session.value)
        assertEquals(
            AuthenticationState.Unauthenticated("无法安全保存登录状态，请重试"),
            repository.state.value,
        )
    }

    @Test
    fun cancelledSessionWritePropagatesCancellation() = runTest {
        val cancellation = CancellationException("cancelled")
        val repository = AuthenticationRepository(
            authApi = FakeAuthApi(AuthResult.Success(remoteSession())),
            sessionStore = object : SessionStore {
                override suspend fun read(): AppSession? = null

                override suspend fun write(session: AppSession) = throw cancellation

                override suspend fun clear() = Unit
            },
        )
        var thrown: CancellationException? = null

        try {
            repository.login(AuthCredentials("tongda", "worker", "secret12"))
        } catch (failure: CancellationException) {
            thrown = failure
        }

        assertSame(cancellation, thrown)
    }

    @Test
    fun expiredSessionClearsStoreAndReturnsToLoginWithReadableMessage() = runTest {
        val store = FakeSessionStore(remoteSession().toAppSession())
        val repository = AuthenticationRepository(
            authApi = FakeAuthApi(AuthResult.Failure(AuthFailure.NetworkUnavailable)),
            sessionStore = store,
        )

        repository.invalidate(AuthFailure.SessionExpired)

        assertNull(store.value)
        assertNull(repository.session.value)
        assertEquals(
            AuthenticationState.Unauthenticated("登录已过期，请重新登录"),
            repository.state.value,
        )
    }

    @Test
    fun logoutClearsSessionAndReturnsUnauthenticated() = runTest {
        val store = FakeSessionStore(remoteSession().toAppSession())
        val repository = AuthenticationRepository(
            authApi = FakeAuthApi(AuthResult.Failure(AuthFailure.NetworkUnavailable)),
            sessionStore = store,
        )

        repository.logout()

        assertNull(store.value)
        assertNull(repository.session.value)
        assertTrue(repository.state.value is AuthenticationState.Unauthenticated)
    }

    private fun remoteSession() = RemoteSession(
        token = "token-123",
        role = "staff",
        companyId = "tongda",
        username = "worker",
        displayName = "通达员工",
        permissions = listOf("repair"),
    )

    private class FakeAuthApi(private val result: AuthResult) : AuthApi {
        override suspend fun login(credentials: AuthCredentials): AuthResult = result
    }

    private class FakeSessionStore(initial: AppSession? = null) : SessionStore {
        var value: AppSession? = initial

        override suspend fun read(): AppSession? = value

        override suspend fun write(session: AppSession) {
            value = session
        }

        override suspend fun clear() {
            value = null
        }
    }
}
