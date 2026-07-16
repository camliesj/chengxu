package com.chengxu.autoservice.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

private val AutoserviceColorScheme = lightColorScheme(
    primary = AutoserviceColors.Primary,
    onPrimary = AutoserviceColors.Surface,
    background = AutoserviceColors.Background,
    onBackground = AutoserviceColors.TextPrimary,
    surface = AutoserviceColors.Surface,
    onSurface = AutoserviceColors.TextPrimary,
    surfaceVariant = AutoserviceColors.Background,
    onSurfaceVariant = AutoserviceColors.TextSecondary,
    outline = AutoserviceColors.Border,
    error = AutoserviceColors.Danger,
)

private val DefaultTypography = Typography()

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
        colorScheme = AutoserviceColorScheme,
        typography = AutoserviceTypography,
        content = content,
    )
}
