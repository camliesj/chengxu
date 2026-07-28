package com.chengxu.autoservice.core.update

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

data class AppUpdateDownloadResponse(
    val status: Int,
    val contentLength: Long?,
    val stream: InputStream,
)

interface AppUpdateDownloadTransport {
    suspend fun get(url: String): AppUpdateDownloadResponse
}

sealed interface AppUpdateDownloadResult {
    data class Ready(val file: File) : AppUpdateDownloadResult
    data class Failed(val message: String) : AppUpdateDownloadResult
}

interface AppUpdateDownloader {
    suspend fun download(
        url: String,
        onProgress: (downloaded: Long, total: Long?) -> Unit = { _, _ -> },
    ): AppUpdateDownloadResult
}

class UrlConnectionAppUpdateDownloadTransport : AppUpdateDownloadTransport {
    override suspend fun get(url: String): AppUpdateDownloadResponse = withContext(Dispatchers.IO) {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15_000
            readTimeout = 30_000
        }
        val status = connection.responseCode
        if (status !in 200..299) {
            connection.disconnect()
            return@withContext AppUpdateDownloadResponse(status, null, ByteArrayInputStream(ByteArray(0)))
        }
        ConnectionInputStream(connection, connection.inputStream).let { stream ->
            AppUpdateDownloadResponse(status, connection.contentLengthLong.takeIf { it >= 0L }, stream)
        }
    }

    private class ConnectionInputStream(
        private val connection: HttpURLConnection,
        private val delegate: InputStream,
    ) : InputStream() {
        override fun read(): Int = delegate.read()
        override fun read(buffer: ByteArray, offset: Int, length: Int): Int = delegate.read(buffer, offset, length)
        override fun close() {
            try {
                delegate.close()
            } finally {
                connection.disconnect()
            }
        }
    }
}

class HttpUrlConnectionAppUpdateDownloader(
    private val directory: File,
    private val transport: AppUpdateDownloadTransport = UrlConnectionAppUpdateDownloadTransport(),
) : AppUpdateDownloader {
    override suspend fun download(
        url: String,
        onProgress: (downloaded: Long, total: Long?) -> Unit,
    ): AppUpdateDownloadResult = try {
        if (!isHttps(url)) return AppUpdateDownloadResult.Failed("更新地址不安全")
        val response = transport.get(url)
        if (response.status !in 200..299) {
            response.stream.close()
            return AppUpdateDownloadResult.Failed("下载服务暂不可用")
        }
        withContext(Dispatchers.IO) {
            if (!directory.exists() && !directory.mkdirs()) return@withContext AppUpdateDownloadResult.Failed("无法创建下载目录")
            val finalFile = File(directory, "zhiwei-update.apk")
            val temporaryFile = File(directory, "zhiwei-update.apk.part")
            temporaryFile.delete()
            var downloaded = 0L
            response.stream.use { input ->
                temporaryFile.outputStream().buffered().use { output ->
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        output.write(buffer, 0, count)
                        downloaded += count
                        onProgress(downloaded, response.contentLength)
                    }
                }
            }
            if (downloaded == 0L) {
                temporaryFile.delete()
                return@withContext AppUpdateDownloadResult.Failed("下载文件为空")
            }
            if (finalFile.exists() && !finalFile.delete()) {
                temporaryFile.delete()
                return@withContext AppUpdateDownloadResult.Failed("无法替换旧安装包")
            }
            if (!temporaryFile.renameTo(finalFile)) {
                temporaryFile.delete()
                return@withContext AppUpdateDownloadResult.Failed("保存安装包失败")
            }
            AppUpdateDownloadResult.Ready(finalFile)
        }
    } catch (cancelled: CancellationException) {
        throw cancelled
    } catch (_: IOException) {
        AppUpdateDownloadResult.Failed("网络连接中断")
    } catch (_: Exception) {
        AppUpdateDownloadResult.Failed("下载更新失败")
    }

    private fun isHttps(value: String): Boolean = runCatching {
        URL(value).protocol.equals("https", ignoreCase = true) && URL(value).host.isNotBlank()
    }.getOrDefault(false)
}
