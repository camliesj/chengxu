package com.chengxu.autoservice.ui.update

import com.chengxu.autoservice.core.update.AppUpdateRelease
import java.io.File

enum class UpdatePhase {
    IDLE,
    CHECKING,
    UP_TO_DATE,
    AVAILABLE,
    DOWNLOADING,
    READY_TO_INSTALL,
    FAILED,
}

data class UpdateState(
    val phase: UpdatePhase = UpdatePhase.IDLE,
    val release: AppUpdateRelease? = null,
    val downloadedBytes: Long = 0,
    val totalBytes: Long? = null,
    val downloadedFile: File? = null,
    val message: String? = null,
)
