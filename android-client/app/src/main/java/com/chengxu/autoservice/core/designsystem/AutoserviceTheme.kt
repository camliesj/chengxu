package com.chengxu.autoservice.core.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val AutoserviceLightColorScheme = lightColorScheme(
    primary = AutoserviceColors.Action,
    onPrimary = AutoserviceColors.ActionOn,
    primaryContainer = AutoserviceColors.Ice,
    onPrimaryContainer = AutoserviceColors.Ink,
    inversePrimary = AutoserviceColors.Surface,
    secondary = AutoserviceColors.InkMuted,
    onSecondary = AutoserviceColors.Surface,
    secondaryContainer = AutoserviceColors.SurfaceSoft,
    onSecondaryContainer = AutoserviceColors.Ink,
    tertiary = AutoserviceColors.Success,
    onTertiary = AutoserviceColors.Surface,
    tertiaryContainer = AutoserviceColors.Ice,
    onTertiaryContainer = AutoserviceColors.Ink,
    background = AutoserviceColors.Canvas,
    onBackground = AutoserviceColors.Ink,
    surface = AutoserviceColors.Surface,
    onSurface = AutoserviceColors.Ink,
    surfaceVariant = AutoserviceColors.SurfaceSoft,
    onSurfaceVariant = AutoserviceColors.InkMuted,
    surfaceTint = AutoserviceColors.Action,
    inverseSurface = AutoserviceColors.Ink,
    inverseOnSurface = AutoserviceColors.Surface,
    error = AutoserviceColors.Danger,
    onError = AutoserviceColors.Surface,
    errorContainer = AutoserviceColors.SurfaceSoft,
    onErrorContainer = AutoserviceColors.Ink,
    outline = AutoserviceColors.Line,
    outlineVariant = AutoserviceColors.Line,
    scrim = AutoserviceColors.Ink,
    surfaceBright = AutoserviceColors.Surface,
    surfaceDim = AutoserviceColors.Canvas,
    surfaceContainer = AutoserviceColors.Surface,
    surfaceContainerHigh = AutoserviceColors.SurfaceSoft,
    surfaceContainerHighest = AutoserviceColors.SurfaceSoft,
    surfaceContainerLow = AutoserviceColors.Surface,
    surfaceContainerLowest = AutoserviceColors.Surface,
    primaryFixed = AutoserviceColors.Ice,
    primaryFixedDim = AutoserviceColors.Action,
    onPrimaryFixed = AutoserviceColors.Ink,
    onPrimaryFixedVariant = AutoserviceColors.Action,
    secondaryFixed = AutoserviceColors.SurfaceSoft,
    secondaryFixedDim = AutoserviceColors.InkMuted,
    onSecondaryFixed = AutoserviceColors.Ink,
    onSecondaryFixedVariant = AutoserviceColors.InkMuted,
    tertiaryFixed = AutoserviceColors.Ice,
    tertiaryFixedDim = AutoserviceColors.Success,
    onTertiaryFixed = AutoserviceColors.Ink,
    onTertiaryFixedVariant = AutoserviceColors.Success,
)

val AutoserviceShapes = Shapes(
    extraSmall = RoundedCornerShape(AutoserviceRadii.Card),
    small = RoundedCornerShape(AutoserviceRadii.Card),
    medium = RoundedCornerShape(AutoserviceRadii.Card),
    large = RoundedCornerShape(AutoserviceRadii.Panel),
    extraLarge = RoundedCornerShape(AutoserviceRadii.Panel),
)

private val AutoserviceTypography = Typography(
    displayLarge = brandTextStyle(40, FontWeight.SemiBold),
    displayMedium = brandTextStyle(36, FontWeight.SemiBold),
    displaySmall = brandTextStyle(32, FontWeight.SemiBold),
    headlineLarge = brandTextStyle(28, FontWeight.SemiBold),
    headlineMedium = brandTextStyle(24, FontWeight.SemiBold),
    headlineSmall = brandTextStyle(22, FontWeight.SemiBold),
    titleLarge = brandTextStyle(20, FontWeight.SemiBold),
    titleMedium = brandTextStyle(17, FontWeight.SemiBold),
    titleSmall = brandTextStyle(15, FontWeight.SemiBold),
    bodyLarge = brandTextStyle(16, FontWeight.Normal),
    bodyMedium = brandTextStyle(14, FontWeight.Normal),
    bodySmall = brandTextStyle(12, FontWeight.Normal),
    labelLarge = brandTextStyle(14, FontWeight.Medium),
    labelMedium = brandTextStyle(12, FontWeight.Medium),
    labelSmall = brandTextStyle(11, FontWeight.Medium),
)

private fun brandTextStyle(size: Int, weight: FontWeight) =
    androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = weight,
        fontSize = size.sp,
        letterSpacing = 0.sp,
    )

@Composable
fun AutoserviceTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AutoserviceLightColorScheme,
        typography = AutoserviceTypography,
        shapes = AutoserviceShapes,
        content = content,
    )
}
