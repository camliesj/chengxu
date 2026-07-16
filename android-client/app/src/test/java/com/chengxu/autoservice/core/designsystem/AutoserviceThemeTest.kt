package com.chengxu.autoservice.core.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AutoserviceThemeTest {
    @Test
    fun materialShapesUseTheUniformAutoserviceRadius() {
        assertEquals(AutoserviceShape, AutoserviceShapes.extraSmall)
        assertEquals(AutoserviceShape, AutoserviceShapes.small)
        assertEquals(AutoserviceShape, AutoserviceShapes.medium)
        assertEquals(AutoserviceShape, AutoserviceShapes.large)
        assertEquals(AutoserviceShape, AutoserviceShapes.extraLarge)
    }

    @Test
    fun canonicalColorsMatchTheApprovedArgbValues() {
        assertEquals(0xFFF5F7FA.toInt(), AutoserviceColors.Background.toArgb())
        assertEquals(0xFFFFFFFF.toInt(), AutoserviceColors.Surface.toArgb())
        assertEquals(0xFF1677FF.toInt(), AutoserviceColors.Primary.toArgb())
        assertEquals(0xFF172033.toInt(), AutoserviceColors.TextPrimary.toArgb())
        assertEquals(0xFF667085.toInt(), AutoserviceColors.TextSecondary.toArgb())
        assertEquals(0xFF98A2B3.toInt(), AutoserviceColors.TextMuted.toArgb())
        assertEquals(0xFFE4EAF2.toInt(), AutoserviceColors.Border.toArgb())
        assertEquals(0xFF12A05C.toInt(), AutoserviceColors.Success.toArgb())
        assertEquals(0xFFFF8A00.toInt(), AutoserviceColors.Warning.toArgb())
        assertEquals(0xFFFF3B30.toInt(), AutoserviceColors.Danger.toArgb())
    }

    @Test
    fun componentTonesAndOfflineBannerUseOnlyApprovedColors() {
        val approvedColors = setOf(
            AutoserviceColors.Background,
            AutoserviceColors.Surface,
            AutoserviceColors.Primary,
            AutoserviceColors.TextPrimary,
            AutoserviceColors.TextSecondary,
            AutoserviceColors.TextMuted,
            AutoserviceColors.Border,
            AutoserviceColors.Success,
            AutoserviceColors.Warning,
            AutoserviceColors.Danger,
        )

        assertEquals(AutoserviceColors.Background, AutoserviceColors.OfflineBannerBackground)
        assertTrue(StatusTone.entries.map(StatusTone::color).all { it in approvedColors })
        assertTrue(MetricTone.entries.map(MetricTone::color).all { it in approvedColors })
    }

    @Test
    fun everyMaterialColorRoleUsesOnlyApprovedCanonicalColors() {
        val colors = AutoserviceLightColorScheme
        val roles = mapOf(
            "primary" to colors.primary,
            "onPrimary" to colors.onPrimary,
            "primaryContainer" to colors.primaryContainer,
            "onPrimaryContainer" to colors.onPrimaryContainer,
            "inversePrimary" to colors.inversePrimary,
            "secondary" to colors.secondary,
            "onSecondary" to colors.onSecondary,
            "secondaryContainer" to colors.secondaryContainer,
            "onSecondaryContainer" to colors.onSecondaryContainer,
            "tertiary" to colors.tertiary,
            "onTertiary" to colors.onTertiary,
            "tertiaryContainer" to colors.tertiaryContainer,
            "onTertiaryContainer" to colors.onTertiaryContainer,
            "background" to colors.background,
            "onBackground" to colors.onBackground,
            "surface" to colors.surface,
            "onSurface" to colors.onSurface,
            "surfaceVariant" to colors.surfaceVariant,
            "onSurfaceVariant" to colors.onSurfaceVariant,
            "surfaceTint" to colors.surfaceTint,
            "inverseSurface" to colors.inverseSurface,
            "inverseOnSurface" to colors.inverseOnSurface,
            "error" to colors.error,
            "onError" to colors.onError,
            "errorContainer" to colors.errorContainer,
            "onErrorContainer" to colors.onErrorContainer,
            "outline" to colors.outline,
            "outlineVariant" to colors.outlineVariant,
            "scrim" to colors.scrim,
            "surfaceBright" to colors.surfaceBright,
            "surfaceDim" to colors.surfaceDim,
            "surfaceContainer" to colors.surfaceContainer,
            "surfaceContainerHigh" to colors.surfaceContainerHigh,
            "surfaceContainerHighest" to colors.surfaceContainerHighest,
            "surfaceContainerLow" to colors.surfaceContainerLow,
            "surfaceContainerLowest" to colors.surfaceContainerLowest,
            "primaryFixed" to colors.primaryFixed,
            "primaryFixedDim" to colors.primaryFixedDim,
            "onPrimaryFixed" to colors.onPrimaryFixed,
            "onPrimaryFixedVariant" to colors.onPrimaryFixedVariant,
            "secondaryFixed" to colors.secondaryFixed,
            "secondaryFixedDim" to colors.secondaryFixedDim,
            "onSecondaryFixed" to colors.onSecondaryFixed,
            "onSecondaryFixedVariant" to colors.onSecondaryFixedVariant,
            "tertiaryFixed" to colors.tertiaryFixed,
            "tertiaryFixedDim" to colors.tertiaryFixedDim,
            "onTertiaryFixed" to colors.onTertiaryFixed,
            "onTertiaryFixedVariant" to colors.onTertiaryFixedVariant,
        )
        val approvedColors = setOf(
            AutoserviceColors.Background,
            AutoserviceColors.Surface,
            AutoserviceColors.Primary,
            AutoserviceColors.TextPrimary,
            AutoserviceColors.TextSecondary,
            AutoserviceColors.TextMuted,
            AutoserviceColors.Border,
            AutoserviceColors.Success,
            AutoserviceColors.Warning,
            AutoserviceColors.Danger,
        )
        val unapprovedRoles = roles.filterValues { it !in approvedColors }

        assertTrue("Unapproved Material colors: ${unapprovedRoles.toArgbReport()}", unapprovedRoles.isEmpty())
    }

    private fun Map<String, Color>.toArgbReport(): Map<String, String> =
        mapValues { (_, color) -> "#%08X".format(color.toArgb()) }
}
