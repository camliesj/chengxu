package com.chengxu.autoservice.core.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object AutoserviceColors {
    val Canvas = Color(0xFFF4F6F8)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceSoft = Color(0xFFF0F3F7)
    val Ice = Color(0xFFEAF1FB)
    val Ink = Color(0xFF101214)
    val InkMuted = Color(0xFF697079)
    val Line = Color(0xFFE3E7EC)
    val Action = Color(0xFF111315)
    val ActionOn = Surface
    val Success = Color(0xFF25805F)
    val Warning = Color(0xFFA96816)
    val Danger = Color(0xFFB84A45)

    // Compatibility aliases keep existing screens compiling while each page is migrated.
    val Background = Canvas
    val Primary = Action
    val TextPrimary = Ink
    val TextSecondary = InkMuted
    val TextMuted = InkMuted
    val Border = Line
    val OfflineBannerBackground = Ice
}

object AutoserviceSpacing {
    val Xs = 4.dp
    val Sm = 8.dp
    val Md = 12.dp
    val Lg = 16.dp
    val Xl = 24.dp
}

object AutoserviceRadii {
    val Panel = 20.dp
    val Card = 16.dp
    val Control = 16.dp
}

object AutoserviceMotion {
    const val FastMillis = 120
    const val BaseMillis = 180
}

val AutoserviceShape = RoundedCornerShape(AutoserviceRadii.Card)
val AutoservicePanelShape = RoundedCornerShape(AutoserviceRadii.Panel)
val AutoserviceControlShape = RoundedCornerShape(AutoserviceRadii.Control)
