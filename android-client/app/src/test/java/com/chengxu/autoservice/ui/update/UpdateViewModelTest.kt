package com.chengxu.autoservice.ui.update

import com.chengxu.autoservice.core.update.AppUpdateApi
import com.chengxu.autoservice.core.update.AppUpdateDownloadResult
import com.chengxu.autoservice.core.update.AppUpdateDownloader
import com.chengxu.autoservice.core.update.AppUpdateFetchResult
import com.chengxu.autoservice.core.update.AppUpdateRelease
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.io.File
import kotlin.io.path.createTempFile

@OptIn(ExperimentalCoroutinesApi::class)
class UpdateViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test
    fun checkShowsAvailableReleaseOnlyWhenRemoteIsNewer() = runTest {
        val viewModel = UpdateViewModel(
            api = FakeApi(AppUpdateFetchResult.Success(release("0.1.1"))),
            downloader = FakeDownloader(),
            currentVersion = "0.1.0",
        )

        viewModel.check()
        runCurrent()

        assertEquals(UpdatePhase.AVAILABLE, viewModel.state.value.phase)
        assertEquals("0.1.1", viewModel.state.value.release?.version)
    }

    @Test
    fun checkShowsUpToDateForEqualOrUnavailableRelease() = runTest {
        val equal = UpdateViewModel(FakeApi(AppUpdateFetchResult.Success(release("0.1.0"))), FakeDownloader(), "0.1.0")
        equal.check()
        runCurrent()
        assertEquals(UpdatePhase.UP_TO_DATE, equal.state.value.phase)

        val unavailable = UpdateViewModel(FakeApi(AppUpdateFetchResult.Success(null)), FakeDownloader(), "0.1.0")
        unavailable.check()
        runCurrent()
        assertEquals(UpdatePhase.UP_TO_DATE, unavailable.state.value.phase)
    }

    @Test
    fun downloadTransitionsToReadyToInstall() = runTest {
        val file = createTempFile("update", ".apk").toFile().apply { writeBytes(byteArrayOf(1)) }
        val viewModel = UpdateViewModel(FakeApi(AppUpdateFetchResult.Success(release("0.1.1"))), FakeDownloader(AppUpdateDownloadResult.Ready(file)), "0.1.0")
        viewModel.check()
        runCurrent()

        viewModel.download()
        runCurrent()

        assertEquals(UpdatePhase.READY_TO_INSTALL, viewModel.state.value.phase)
        assertEquals(file, viewModel.state.value.downloadedFile)
    }

    private fun release(version: String) = AppUpdateRelease(version, "2026-07-28", "20 MB", "更新说明", "https://chengxu.pages.dev/app.apk")

    private class FakeApi(private val result: AppUpdateFetchResult) : AppUpdateApi {
        override suspend fun fetch(): AppUpdateFetchResult = result
    }

    private class FakeDownloader(
        private val result: AppUpdateDownloadResult = AppUpdateDownloadResult.Failed("下载失败"),
    ) : AppUpdateDownloader {
        override suspend fun download(url: String, onProgress: (Long, Long?) -> Unit): AppUpdateDownloadResult = result
    }
}
