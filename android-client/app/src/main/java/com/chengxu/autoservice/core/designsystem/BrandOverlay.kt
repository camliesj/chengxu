package com.chengxu.autoservice.core.designsystem

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.window.Dialog

@Composable
fun BrandConfirmDialog(
    title: String,
    description: String,
    cancelLabel: String,
    confirmLabel: String,
    onCancel: () -> Unit,
    onConfirm: () -> Unit,
    returnFocusRequester: FocusRequester? = null,
) {
    val cancelFocusRequester = remember { FocusRequester() }
    val dismiss: () -> Unit = {
        onCancel()
        returnFocusRequester?.requestFocus()
    }

    Dialog(onDismissRequest = dismiss) {
        Surface(
            shape = AutoservicePanelShape,
            color = AutoserviceColors.Surface,
            contentColor = AutoserviceColors.Ink,
        ) {
            Column(
                modifier = Modifier.padding(AutoserviceSpacing.Xl),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Lg),
            ) {
                Text(title, style = MaterialTheme.typography.titleLarge)
                Text(
                    description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AutoserviceColors.InkMuted,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
                ) {
                    BrandButton(
                        onClick = dismiss,
                        modifier = Modifier.weight(1f).focusRequester(cancelFocusRequester),
                        tone = BrandButtonTone.SECONDARY,
                    ) { Text(cancelLabel) }
                    BrandButton(
                        onClick = onConfirm,
                        modifier = Modifier.weight(1f),
                        tone = BrandButtonTone.DANGER,
                    ) { Text(confirmLabel) }
                }
            }
        }
    }

    LaunchedEffect(Unit) { cancelFocusRequester.requestFocus() }
}
