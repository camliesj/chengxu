package com.chengxu.autoservice.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable
sealed interface AppRoute : NavKey {
    @Serializable
    data object Workbench : AppRoute

    @Serializable
    data object Orders : AppRoute

    @Serializable
    data object CreateOrder : AppRoute

    @Serializable
    data object Records : AppRoute

    @Serializable
    data object Profile : AppRoute

    @Serializable
    data class OrderDetail(val orderId: String) : AppRoute
}
