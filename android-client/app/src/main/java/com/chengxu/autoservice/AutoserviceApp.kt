package com.chengxu.autoservice

import androidx.compose.runtime.Composable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.SessionRepository
import com.chengxu.autoservice.ui.shell.AutoserviceShell
import com.chengxu.autoservice.ui.workbench.WorkbenchRepository
import com.chengxu.autoservice.ui.workbench.WorkbenchViewModel

@Composable
fun AutoserviceApp(
    sessionRepository: SessionRepository,
    networkMonitor: NetworkMonitor,
    workbenchRepository: WorkbenchRepository,
) {
    val viewModel: WorkbenchViewModel = viewModel(
        factory = workbenchViewModelFactory(sessionRepository, networkMonitor, workbenchRepository),
    )
    val state = viewModel.uiState.collectAsStateWithLifecycle().value

    AutoserviceTheme {
        AutoserviceShell(
            connection = state.connection,
            workbenchState = state,
            onWorkbenchAction = {},
        )
    }
}

private fun workbenchViewModelFactory(
    sessionRepository: SessionRepository,
    networkMonitor: NetworkMonitor,
    workbenchRepository: WorkbenchRepository,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(WorkbenchViewModel::class.java)) {
            return WorkbenchViewModel(sessionRepository, networkMonitor, workbenchRepository) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}
