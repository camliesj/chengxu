package com.chengxu.autoservice.ui.auth

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

internal data class LoginLayoutSpec(
    val heroHeight: Dp,
    val panelOverlap: Dp,
    val vehicleSlotHeight: Dp,
    val showVehicle: Boolean,
    val showMarketingTitle: Boolean,
)

internal fun loginLayoutSpec(imeVisible: Boolean): LoginLayoutSpec =
    if (imeVisible) {
        LoginLayoutSpec(
            heroHeight = 96.dp,
            panelOverlap = 16.dp,
            vehicleSlotHeight = 0.dp,
            showVehicle = false,
            showMarketingTitle = false,
        )
    } else {
        LoginLayoutSpec(
            heroHeight = 200.dp,
            panelOverlap = 16.dp,
            vehicleSlotHeight = 154.dp,
            showVehicle = true,
            showMarketingTitle = true,
        )
    }
