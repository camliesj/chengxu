package com.chengxu.autoservice.navigation

enum class RootTab(
    val label: String,
    val root: AppRoute,
) {
    WORKBENCH("工作台", AppRoute.Workbench),
    ORDERS("工单", AppRoute.Orders),
    CREATE("新增", AppRoute.CreateOrder),
    RECORDS("档案", AppRoute.Records),
    PROFILE("我的", AppRoute.Profile),
}
