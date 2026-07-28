package com.chengxu.autoservice.core.update

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.File
import kotlin.io.path.createTempDirectory

class AppUpdateDownloaderTest {
    @Test
    fun downloaderWritesCompletedHttpsResponseToFinalApk() = runTest {
        val directory = createTempDirectory("app-update-test").toFile()
        val progress = mutableListOf<Pair<Long, Long?>>()
        val downloader = HttpUrlConnectionAppUpdateDownloader(
            directory,
            FakeTransport(AppUpdateDownloadResponse(200, 3, ByteArrayInputStream(byteArrayOf(1, 2, 3)))),
        )

        val result = downloader.download("https://chengxu.pages.dev/downloads/zhiwei-car-service_0.1.1.apk") { downloaded, total ->
            progress += downloaded to total
        }

        assertTrue(result is AppUpdateDownloadResult.Ready)
        val file = (result as AppUpdateDownloadResult.Ready).file
        assertEquals("zhiwei-update.apk", file.name)
        assertTrue(file.readBytes().contentEquals(byteArrayOf(1, 2, 3)))
        assertEquals(3L to 3L, progress.last())
        assertFalse(File(directory, "zhiwei-update.apk.part").exists())
    }

    @Test
    fun downloaderRejectsUnsafeOrFailedResponseWithoutFinalFile() = runTest {
        val directory = createTempDirectory("app-update-test").toFile()
        val downloader = HttpUrlConnectionAppUpdateDownloader(
            directory,
            FakeTransport(AppUpdateDownloadResponse(503, null, ByteArrayInputStream(ByteArray(0)))),
        )

        assertTrue(downloader.download("http://example.invalid/app.apk") is AppUpdateDownloadResult.Failed)
        assertTrue(downloader.download("https://chengxu.pages.dev/app.apk") is AppUpdateDownloadResult.Failed)
        assertFalse(File(directory, "zhiwei-update.apk").exists())
    }

    private class FakeTransport(private val response: AppUpdateDownloadResponse) : AppUpdateDownloadTransport {
        override suspend fun get(url: String): AppUpdateDownloadResponse = response
    }
}
