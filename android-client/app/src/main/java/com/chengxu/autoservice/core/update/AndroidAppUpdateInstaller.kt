package com.chengxu.autoservice.core.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File

sealed interface AppUpdateInstallRequest {
    data class Install(val intent: Intent) : AppUpdateInstallRequest
    data class GrantPermission(val intent: Intent) : AppUpdateInstallRequest
    data class Failed(val message: String) : AppUpdateInstallRequest
}

class AndroidAppUpdateInstaller(private val context: Context) {
    fun requestInstall(file: File): AppUpdateInstallRequest {
        if (!file.isFile || file.length() == 0L) return AppUpdateInstallRequest.Failed("安装包不存在")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
            return AppUpdateInstallRequest.GrantPermission(
                Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${context.packageName}"),
                ),
            )
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.update-provider", file)
        return AppUpdateInstallRequest.Install(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
