package com.chengxu.autoservice.ui.auth

import com.chengxu.autoservice.core.auth.AuthApi
import com.chengxu.autoservice.core.auth.AuthCredentials
import com.chengxu.autoservice.core.auth.AuthFailure
import com.chengxu.autoservice.core.auth.AuthResult
import com.chengxu.autoservice.core.auth.AuthenticatedDataCleaner
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.SessionStore
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test
    fun blankAccountAndPasswordAreRejectedBeforeCallingApi() = runTest {
        val api = RecordingAuthApi()
        val viewModel = viewModel(api, ConnectionState.Online)

        viewModel.submit()

        assertEquals("请填写账号和密码", viewModel.uiState.value.errorMessage)
        assertEquals(0, api.callCount)
    }

    @Test
    fun offlineSubmissionIsRejectedBeforeCallingApi() = runTest {
        val api = RecordingAuthApi()
        val viewModel = viewModel(api, ConnectionState.Offline)
        viewModel.updateUsername("worker")
        viewModel.updatePassword("secret12")

        viewModel.submit()

        assertEquals("网络不可用，请检查网络连接后重试", viewModel.uiState.value.errorMessage)
        assertEquals(0, api.callCount)
    }

    @Test
    fun successfulSubmissionUsesSelectedCompanyAndClearsPassword() = runTest {
        val api = RecordingAuthApi(AuthResult.Success(remoteSession()))
        val viewModel = viewModel(api, ConnectionState.Online)
        viewModel.selectCompany("xinqiheng")
        viewModel.updateUsername("  worker  ")
        viewModel.updatePassword("secret12")

        viewModel.submit()

        assertEquals(AuthCredentials("xinqiheng", "worker", "secret12"), api.lastCredentials)
        assertEquals("", viewModel.uiState.value.password)
        assertNull(viewModel.uiState.value.errorMessage)
    }

    @Test
    fun authenticationMessageReplacesStaleLocalError() = runTest {
        val viewModel = viewModel(RecordingAuthApi(), ConnectionState.Online)
        viewModel.submit()

        viewModel.syncAuthenticationMessage("登录已过期，请重新登录")

        assertEquals("登录已过期，请重新登录", viewModel.uiState.value.errorMessage)
    }

    @Test
    fun duplicateSubmissionIsIgnoredAndServerErrorIsReadable() = runTest {
        val api = SuspendingAuthApi()
        val viewModel = viewModel(api, ConnectionState.Online)
        viewModel.updateUsername("worker")
        viewModel.updatePassword("secret12")

        viewModel.submit()
        api.started.await()
        viewModel.submit()

        assertEquals(1, api.callCount)
        assertEquals(true, viewModel.uiState.value.submitting)

        api.result.complete(AuthResult.Failure(AuthFailure.ServerError))
        advanceUntilIdle()

        assertEquals(false, viewModel.uiState.value.submitting)
        assertEquals("服务器暂时不可用，请稍后重试", viewModel.uiState.value.errorMessage)
    }

    private fun viewModel(api: AuthApi, connection: ConnectionState) = LoginViewModel(
        authenticationRepository = AuthenticationRepository(
            api,
            EmptySessionStore(),
            AuthenticatedDataCleaner { },
        ),
        networkMonitor = FakeNetworkMonitor(connection),
    )

    private fun remoteSession() = com.chengxu.autoservice.core.auth.RemoteSession(
        token = "token-123",
        role = "staff",
        companyId = "xinqiheng",
        username = "worker",
        displayName = "鑫齐恒员工",
        permissions = emptyList(),
    )

    private class RecordingAuthApi(
        private val result: AuthResult = AuthResult.Failure(AuthFailure.InvalidCredentials),
    ) : AuthApi {
        var callCount = 0
        var lastCredentials: AuthCredentials? = null
        override suspend fun login(credentials: AuthCredentials): AuthResult {
            callCount += 1
            lastCredentials = credentials
            return result
        }
    }

    private class SuspendingAuthApi : AuthApi {
        val started = CompletableDeferred<Unit>()
        val result = CompletableDeferred<AuthResult>()
        var callCount = 0

        override suspend fun login(credentials: AuthCredentials): AuthResult {
            callCount += 1
            started.complete(Unit)
            return result.await()
        }
    }

    private class EmptySessionStore : SessionStore {
        override suspend fun read(): AppSession? = null
        override suspend fun write(session: AppSession) = Unit
        override suspend fun clear() = Unit
    }

    private class FakeNetworkMonitor(connection: ConnectionState) : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(connection)
    }
}
