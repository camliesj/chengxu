package com.chengxu.autoservice.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

val AutoserviceLightColorScheme = lightColorScheme(
    primary = AutoserviceColors.Primary,
    onPrimary = AutoserviceColors.Surface,
    primaryContainer = AutoserviceColors.Background,
    onPrimaryContainer = AutoserviceColors.TextPrimary,
    inversePrimary = AutoserviceColors.Primary,
    secondary = AutoserviceColors.TextSecondary,
    onSecondary = AutoserviceColors.Surface,
    secondaryContainer = AutoserviceColors.Background,
    onSecondaryContainer = AutoserviceColors.TextPrimary,
    tertiary = AutoserviceColors.Success,
    onTertiary = AutoserviceColors.Surface,
    tertiaryContainer = AutoserviceColors.Background,
    onTertiaryContainer = AutoserviceColors.TextPrimary,
    background = AutoserviceColors.Background,
    onBackground = AutoserviceColors.TextPrimary,
    surface = AutoserviceColors.Surface,
    onSurface = AutoserviceColors.TextPrimary,
    surfaceVariant = AutoserviceColors.Background,
    onSurfaceVariant = AutoserviceColors.TextSecondary,
    surfaceTint = AutoserviceColors.Primary,
    inverseSurface = AutoserviceColors.TextPrimary,
    inverseOnSurface = AutoserviceColors.Surface,
    error = AutoserviceColors.Danger,
    onError = AutoserviceColors.Surface,
    errorContainer = AutoserviceColors.Background,
    onErrorContainer = AutoserviceColors.TextPrimary,
    outline = AutoserviceColors.Border,
    outlineVariant = AutoserviceColors.Border,
    scrim = AutoserviceColors.TextPrimary,
    surfaceBright = AutoserviceColors.Surface,
    surfaceDim = AutoserviceColors.Background,
    surfaceContainer = AutoserviceColors.Surface,
    surfaceContainerHigh = AutoserviceColors.Background,
    surfaceContainerHighest = AutoserviceColors.Background,
    surfaceContainerLow = AutoserviceColors.Surface,
    surfaceContainerLowest = AutoserviceColors.Surface,
    primaryFixed = AutoserviceColors.Background,
    primaryFixedDim = AutoserviceColors.Primary,
    onPrimaryFixed = AutoserviceColors.TextPrimary,
    onPrimaryFixedVariant = AutoserviceColors.Primary,
    secondaryFixed = AutoserviceColors.Background,
    secondaryFixedDim = AutoserviceColors.TextSecondary,
    onSecondaryFixed = AutoserviceColors.TextPrimary,
    onSecondaryFixedVariant = AutoserviceColors.TextSecondary,
    tertiaryFixed = AutoserviceColors.Background,
    tertiaryFixedDim = AutoserviceColors.Success,
    onTertiaryFixed = AutoserviceColors.TextPrimary,
    onTertiaryFixedVariant = AutoserviceColors.Success,
)

private val DefaultTypography = Typography()

val AutoserviceShapes = Shapes(
    extraSmall = AutoserviceShape,
    small = AutoserviceShape,
    medium = AutoserviceShape,
    large = AutoserviceShape,
    extraLarge = AutoserviceShape,
)

private val AutoserviceTypography = Typography(
    displayLarge = DefaultTypography.displayLarge.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    displayMedium = DefaultTypography.displayMedium.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    displaySmall = DefaultTypography.displaySmall.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    headlineLarge = DefaultTypography.headlineLarge.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    headlineMedium = DefaultTypography.headlineMedium.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    headlineSmall = DefaultTypography.headlineSmall.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    titleLarge = DefaultTypography.titleLarge.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    titleMedium = DefaultTypography.titleMedium.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    titleSmall = DefaultTypography.titleSmall.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    bodyLarge = DefaultTypography.bodyLarge.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    bodyMedium = DefaultTypography.bodyMedium.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    bodySmall = DefaultTypography.bodySmall.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    labelLarge = DefaultTypography.labelLarge.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    labelMedium = DefaultTypography.labelMedium.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
    labelSmall = DefaultTypography.labelSmall.copy(fontFamily = FontFamily.Default, letterSpacing = 0.sp),
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
