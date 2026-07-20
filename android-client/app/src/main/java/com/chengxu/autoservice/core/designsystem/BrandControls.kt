package com.chengxu.autoservice.core.designsystem

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp

enum class BrandButtonTone { PRIMARY, SECONDARY, QUIET, DANGER }

@Composable
fun BrandButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tone: BrandButtonTone = BrandButtonTone.PRIMARY,
    icon: BrandIconResource? = null,
    loading: Boolean = false,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled) 0.98f else 1f,
        animationSpec = tween(AutoserviceMotion.FastMillis),
        label = "brand-button-scale",
    )
    val buttonModifier = modifier
        .heightIn(min = 48.dp)
        .graphicsLayer { scaleX = scale; scaleY = scale }
    val buttonContent: @Composable RowScope.() -> Unit = {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = if (tone == BrandButtonTone.PRIMARY || tone == BrandButtonTone.DANGER) {
                    AutoserviceColors.Surface
                } else {
                    AutoserviceColors.Action
                },
            )
            Spacer(Modifier.width(AutoserviceSpacing.Sm))
        } else if (icon != null) {
            BrandIcon(resource = icon, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(AutoserviceSpacing.Sm))
        }
        content()
    }
    val active = enabled && !loading

    when (tone) {
        BrandButtonTone.PRIMARY -> Button(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = active,
            interactionSource = interactionSource,
            shape = AutoserviceControlShape,
            colors = ButtonDefaults.buttonColors(
                containerColor = AutoserviceColors.Action,
                contentColor = AutoserviceColors.ActionOn,
                disabledContainerColor = AutoserviceColors.SurfaceSoft,
                disabledContentColor = AutoserviceColors.InkMuted,
            ),
            content = buttonContent,
        )
        BrandButtonTone.DANGER -> Button(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = active,
            interactionSource = interactionSource,
            shape = AutoserviceControlShape,
            colors = ButtonDefaults.buttonColors(
                containerColor = AutoserviceColors.Danger,
                contentColor = AutoserviceColors.Surface,
                disabledContainerColor = AutoserviceColors.SurfaceSoft,
                disabledContentColor = AutoserviceColors.InkMuted,
            ),
            content = buttonContent,
        )
        BrandButtonTone.SECONDARY -> OutlinedButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = active,
            interactionSource = interactionSource,
            shape = AutoserviceControlShape,
            border = BorderStroke(1.dp, AutoserviceColors.Line),
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = AutoserviceColors.Surface,
                contentColor = AutoserviceColors.Ink,
                disabledContentColor = AutoserviceColors.InkMuted,
            ),
            content = buttonContent,
        )
        BrandButtonTone.QUIET -> TextButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = active,
            interactionSource = interactionSource,
            shape = AutoserviceControlShape,
            colors = ButtonDefaults.textButtonColors(
                contentColor = AutoserviceColors.Ink,
                disabledContentColor = AutoserviceColors.InkMuted,
            ),
            content = buttonContent,
        )
    }
}

@Composable
fun BrandTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    leadingIcon: BrandIconResource? = null,
    trailingContent: (@Composable () -> Unit)? = null,
    enabled: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = true,
        label = { Text(label) },
        leadingIcon = leadingIcon?.let { resource ->
            { BrandIcon(resource = resource, contentDescription = null) }
        },
        trailingIcon = trailingContent,
        supportingText = error?.let { message -> { Text(message) } },
        isError = error != null,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        shape = AutoserviceControlShape,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = AutoserviceColors.Action,
            unfocusedBorderColor = AutoserviceColors.Line,
            disabledBorderColor = AutoserviceColors.Line,
            errorBorderColor = AutoserviceColors.Danger,
            focusedContainerColor = AutoserviceColors.Surface,
            unfocusedContainerColor = AutoserviceColors.Surface,
            disabledContainerColor = AutoserviceColors.SurfaceSoft,
            focusedTextColor = AutoserviceColors.Ink,
            unfocusedTextColor = AutoserviceColors.Ink,
            disabledTextColor = AutoserviceColors.InkMuted,
            focusedLabelColor = AutoserviceColors.Ink,
            unfocusedLabelColor = AutoserviceColors.InkMuted,
            cursorColor = AutoserviceColors.Action,
            errorCursorColor = AutoserviceColors.Danger,
        ),
    )
}

@Composable
fun CompanySelectionGroup(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        modifier = modifier.selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        content = { content() },
    )
}

@Composable
fun CompanySelectionCard(
    companyName: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    supportingText: String? = null,
    compact: Boolean = false,
) {
    Surface(
        modifier = modifier
            .heightIn(min = if (compact) 56.dp else 72.dp)
            .alpha(if (enabled) 1f else 0.48f)
            .selectable(
                selected = selected,
                enabled = enabled,
                role = Role.RadioButton,
                onClick = onClick,
            ),
        shape = AutoserviceShape,
        color = if (selected) AutoserviceColors.Ice else AutoserviceColors.Surface,
        contentColor = AutoserviceColors.Ink,
        border = BorderStroke(1.dp, if (selected) AutoserviceColors.Action else AutoserviceColors.Line),
    ) {
        Row(
            modifier = if (compact) {
                Modifier.padding(
                    horizontal = AutoserviceSpacing.Md,
                    vertical = AutoserviceSpacing.Sm,
                )
            } else {
                Modifier.padding(AutoserviceSpacing.Md)
            },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        ) {
            BrandIcon(
                resource = BrandIconResource.Building,
                contentDescription = null,
                tint = if (selected) AutoserviceColors.Action else AutoserviceColors.InkMuted,
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = companyName,
                    style = MaterialTheme.typography.labelLarge,
                )
                supportingText?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = AutoserviceColors.InkMuted,
                    )
                }
            }
            if (selected) {
                BrandIcon(
                    resource = BrandIconResource.Check,
                    contentDescription = "已选择",
                    tint = AutoserviceColors.Action,
                )
            }
        }
    }
}
