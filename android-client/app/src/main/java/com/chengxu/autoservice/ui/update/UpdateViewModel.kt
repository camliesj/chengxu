package com.chengxu.autoservice.ui.update

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.update.AppUpdateApi
import com.chengxu.autoservice.core.update.AppUpdateDownloadResult
import com.chengxu.autoservice.core.update.AppUpdateDownloader
import com.chengxu.autoservice.core.update.AppUpdateFailure
import com.chengxu.autoservice.core.update.AppUpdateFetchResult
import com.chengxu.autoservice.core.update.AppUpdateVersion
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class UpdateViewModel(
    private val api: AppUpdateApi,
    private val downloader: AppUpdateDownloader,
    private val currentVersion: String,
) : ViewModel() {
    private val mutableState = MutableStateFlow(UpdateState())
    val state: StateFlow<UpdateState> = mutableState.asStateFlow()

    fun check() {
        if (mutableState.value.phase == UpdatePhase.CHECKING || mutableState.value.phase == UpdatePhase.DOWNLOADING) return
        mutableState.value = UpdateState(phase = UpdatePhase.CHECKING)
        viewModelScope.launch {
            when (val result = api.fetch()) {
                is AppUpdateFetchResult.Success -> {
                    val release = result.release
                    mutableState.value = if (release != null && AppUpdateVersion.isStrictlyNewer(release.version, currentVersion)) {
                        UpdateState(phase = UpdatePhase.AVAILABLE, release = release)
                    } else {
                        UpdateState(phase = UpdatePhase.UP_TO_DATE, message = "已是最新版本")
                    }
                }
                is AppUpdateFetchResult.Failure -> mutableState.value = UpdateState(
                    phase = UpdatePhase.FAILED,
                    message = failureMessage(result.reason),
                )
            }
        }
    }

    fun download() {
        val release = mutableState.value.release ?: return
        if (mutableState.value.phase == UpdatePhase.DOWNLOADING) return
        mutableState.value = UpdateState(phase = UpdatePhase.DOWNLOADING, release = release)
        viewModelScope.launch {
            when (val result = downloader.download(release.downloadUrl) { downloaded, total ->
                mutableState.value = mutableState.value.copy(downloadedBytes = downloaded, totalBytes = total)
            }) {
                is AppUpdateDownloadResult.Ready -> mutableState.value = UpdateState(
                    phase = UpdatePhase.READY_TO_INSTALL,
                    release = release,
                    downloadedFile = result.file,
                    message = "安装包已下载完成",
                )
                is AppUpdateDownloadResult.Failed -> mutableState.value = UpdateState(
                    phase = UpdatePhase.FAILED,
                    release = release,
                    message = result.message,
                )
            }
        }
    }

    fun dismissMessage() {
        mutableState.value = UpdateState()
    }

    fun reportInstallFailure(message: String) {
        mutableState.value = mutableState.value.copy(phase = UpdatePhase.FAILED, message = message)
    }

    private fun failureMessage(reason: AppUpdateFailure): String = when (reason) {
        AppUpdateFailure.NETWORK -> "网络不可用，请稍后重试"
        AppUpdateFailure.SERVER -> "暂时无法检查更新"
        AppUpdateFailure.MALFORMED_RESPONSE -> "更新信息无效"
    }
}
