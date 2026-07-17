package com.chengxu.autoservice.ui.workbench

import kotlinx.coroutines.flow.StateFlow

interface WorkbenchRepository {
    val recentOrders: StateFlow<List<WorkbenchOrder>>
}
