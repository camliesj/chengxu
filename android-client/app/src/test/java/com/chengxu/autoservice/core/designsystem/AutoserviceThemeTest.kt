package com.chengxu.autoservice.core.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AutoserviceThemeTest {
    @Test
    fun materialShapesUseTheApprovedBrandRadii() {
        val cardShape = RoundedCornerShape(AutoserviceRadii.Card)
        val panelShape = RoundedCornerShape(AutoserviceRadii.Panel)
        assertEquals(cardShape, AutoserviceShapes.extraSmall)
        assertEquals(cardShape, AutoserviceShapes.small)
        assertEquals(cardShape, AutoserviceShapes.medium)
        assertEquals(panelShape, AutoserviceShapes.large)
        assertEquals(panelShape, AutoserviceShapes.extraLarge)
    }

    @Test
    fun canonicalColorsMatchTheApprovedBrandArgbValues() {
        assertEquals(0xFFF4F6F8.toInt(), AutoserviceColors.Canvas.toArgb())
        assertEquals(0xFFFFFFFF.toInt(), AutoserviceColors.Surface.toArgb())
        assertEquals(0xFFF0F3F7.toInt(), AutoserviceColors.SurfaceSoft.toArgb())
        assertEquals(0xFFEAF1FB.toInt(), AutoserviceColors.Ice.toArgb())
        assertEquals(0xFF101214.toInt(), AutoserviceColors.Ink.toArgb())
        assertEquals(0xFF697079.toInt(), AutoserviceColors.InkMuted.toArgb())
        assertEquals(0xFFE3E7EC.toInt(), AutoserviceColors.Line.toArgb())
        assertEquals(0xFF111315.toInt(), AutoserviceColors.Action.toArgb())
        assertEquals(0xFFFFFFFF.toInt(), AutoserviceColors.ActionOn.toArgb())
        assertEquals(0xFF25805F.toInt(), AutoserviceColors.Success.toArgb())
        assertEquals(0xFFA96816.toInt(), AutoserviceColors.Warning.toArgb())
        assertEquals(0xFFB84A45.toInt(), AutoserviceColors.Danger.toArgb())
    }

    @Test
    fun brandRadiiAndMotionMatchTheApprovedPrototype() {
        assertEquals(20.dp, AutoserviceRadii.Panel)
        assertEquals(16.dp, AutoserviceRadii.Card)
        assertEquals(16.dp, AutoserviceRadii.Control)
        assertEquals(120, AutoserviceMotion.FastMillis)
        assertEquals(180, AutoserviceMotion.BaseMillis)
    }

    @Test
    fun componentTonesAndOfflineBannerUseOnlyApprovedColors() {
        assertEquals(AutoserviceColors.Ice, AutoserviceColors.OfflineBannerBackground)
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
        val unapprovedRoles = roles.filterValues { it !in approvedColors }

        assertTrue("Unapproved Material colors: ${unapprovedRoles.toArgbReport()}", unapprovedRoles.isEmpty())
    }

    private val approvedColors = setOf(
        AutoserviceColors.Canvas,
        AutoserviceColors.Surface,
        AutoserviceColors.SurfaceSoft,
        AutoserviceColors.Ice,
        AutoserviceColors.Ink,
        AutoserviceColors.InkMuted,
        AutoserviceColors.Line,
        AutoserviceColors.Action,
        AutoserviceColors.ActionOn,
        AutoserviceColors.Success,
        AutoserviceColors.Warning,
        AutoserviceColors.Danger,
    )

    private fun Map<String, Color>.toArgbReport(): Map<String, String> =
        mapValues { (_, color) -> "#%08X".format(color.toArgb()) }
}
