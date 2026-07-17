package com.chengxu.autoservice.ui.workbench

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class DemoWorkbenchRepository : WorkbenchRepository {
    override val recentOrders: StateFlow<List<WorkbenchOrder>> = MutableStateFlow(
        listOf(
            WorkbenchOrder(
                orderNumber = "RO202607150021",
                plateNumber = "蒙K·Q7285",
                customerName = "李女士",
                statusLabel = "在修",
                repairSummary = "左后门钣金整形，等待喷漆复检",
                amountLabel = "预估 2,860",
            ),
            WorkbenchOrder(
                orderNumber = "RO202607150018",
                plateNumber = "蒙K·A3816",
                customerName = "张先生",
                statusLabel = "待结算",
                repairSummary = "费用已确认，等待管理员完成结算",
                amountLabel = "合计 3,040",
            ),
        ),
    )
}
