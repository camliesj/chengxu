package com.chengxu.autoservice.core.designsystem

import org.junit.Assert.assertEquals
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
    fun lightColorSchemeMapsEveryMaterialRoleToAutoserviceTokens() {
        val colors = AutoserviceLightColorScheme

        assertEquals(AutoserviceColors.Primary, colors.primary)
        assertEquals(AutoserviceColors.Surface, colors.onPrimary)
        assertEquals(AutoserviceColors.PrimaryContainer, colors.primaryContainer)
        assertEquals(AutoserviceColors.TextPrimary, colors.onPrimaryContainer)
        assertEquals(AutoserviceColors.Primary, colors.inversePrimary)
        assertEquals(AutoserviceColors.TextSecondary, colors.secondary)
        assertEquals(AutoserviceColors.Surface, colors.onSecondary)
        assertEquals(AutoserviceColors.Background, colors.secondaryContainer)
        assertEquals(AutoserviceColors.TextPrimary, colors.onSecondaryContainer)
        assertEquals(AutoserviceColors.Success, colors.tertiary)
        assertEquals(AutoserviceColors.Surface, colors.onTertiary)
        assertEquals(AutoserviceColors.SuccessContainer, colors.tertiaryContainer)
        assertEquals(AutoserviceColors.TextPrimary, colors.onTertiaryContainer)
        assertEquals(AutoserviceColors.Background, colors.background)
        assertEquals(AutoserviceColors.TextPrimary, colors.onBackground)
        assertEquals(AutoserviceColors.Surface, colors.surface)
        assertEquals(AutoserviceColors.TextPrimary, colors.onSurface)
        assertEquals(AutoserviceColors.Background, colors.surfaceVariant)
        assertEquals(AutoserviceColors.TextSecondary, colors.onSurfaceVariant)
        assertEquals(AutoserviceColors.Primary, colors.surfaceTint)
        assertEquals(AutoserviceColors.TextPrimary, colors.inverseSurface)
        assertEquals(AutoserviceColors.Surface, colors.inverseOnSurface)
        assertEquals(AutoserviceColors.Danger, colors.error)
        assertEquals(AutoserviceColors.Surface, colors.onError)
        assertEquals(AutoserviceColors.DangerContainer, colors.errorContainer)
        assertEquals(AutoserviceColors.TextPrimary, colors.onErrorContainer)
        assertEquals(AutoserviceColors.Border, colors.outline)
        assertEquals(AutoserviceColors.Border, colors.outlineVariant)
        assertEquals(AutoserviceColors.TextPrimary, colors.scrim)
        assertEquals(AutoserviceColors.Surface, colors.surfaceBright)
        assertEquals(AutoserviceColors.Background, colors.surfaceDim)
        assertEquals(AutoserviceColors.Surface, colors.surfaceContainer)
        assertEquals(AutoserviceColors.Background, colors.surfaceContainerHigh)
        assertEquals(AutoserviceColors.Background, colors.surfaceContainerHighest)
        assertEquals(AutoserviceColors.Surface, colors.surfaceContainerLow)
        assertEquals(AutoserviceColors.Surface, colors.surfaceContainerLowest)
        assertEquals(AutoserviceColors.PrimaryContainer, colors.primaryFixed)
        assertEquals(AutoserviceColors.Primary, colors.primaryFixedDim)
        assertEquals(AutoserviceColors.TextPrimary, colors.onPrimaryFixed)
        assertEquals(AutoserviceColors.Primary, colors.onPrimaryFixedVariant)
        assertEquals(AutoserviceColors.Background, colors.secondaryFixed)
        assertEquals(AutoserviceColors.TextSecondary, colors.secondaryFixedDim)
        assertEquals(AutoserviceColors.TextPrimary, colors.onSecondaryFixed)
        assertEquals(AutoserviceColors.TextSecondary, colors.onSecondaryFixedVariant)
        assertEquals(AutoserviceColors.SuccessContainer, colors.tertiaryFixed)
        assertEquals(AutoserviceColors.Success, colors.tertiaryFixedDim)
        assertEquals(AutoserviceColors.TextPrimary, colors.onTertiaryFixed)
        assertEquals(AutoserviceColors.Success, colors.onTertiaryFixedVariant)
    }
}
