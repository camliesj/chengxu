package com.chengxu.autoservice.core.designsystem

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

enum class MetricTone {
    DEFAULT,
    PRIMARY,
    SUCCESS,
    WARNING,
    DANGER,
    ;

    val color
        get() = when (this) {
            DEFAULT -> AutoserviceColors.Ink
            PRIMARY -> AutoserviceColors.Action
            SUCCESS -> AutoserviceColors.Success
            WARNING -> AutoserviceColors.Warning
            DANGER -> AutoserviceColors.Danger
        }
}

enum class StatusTone {
    PRIMARY,
    SUCCESS,
    WARNING,
    DANGER,
    ;

    val color
        get() = when (this) {
            PRIMARY -> AutoserviceColors.Action
            SUCCESS -> AutoserviceColors.Success
            WARNING -> AutoserviceColors.Warning
            DANGER -> AutoserviceColors.Danger
        }
}

@Composable
fun AutoserviceCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier,
        shape = AutoserviceShape,
        color = AutoserviceColors.Surface,
        contentColor = AutoserviceColors.Ink,
        border = BorderStroke(1.dp, AutoserviceColors.Line),
    ) {
        Column(modifier = Modifier.padding(AutoserviceSpacing.Lg), content = content)
    }
}

@Composable
fun MetricCard(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    supportText: String? = null,
    valueTone: MetricTone = MetricTone.DEFAULT,
) {
    AutoserviceCard(modifier = modifier) {
        Text(
            text = label,
            color = AutoserviceColors.InkMuted,
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            text = value,
            modifier = Modifier.padding(top = AutoserviceSpacing.Sm),
            color = valueTone.color,
            style = MaterialTheme.typography.headlineMedium,
        )
        supportText?.let {
            Text(
                text = it,
                modifier = Modifier.padding(top = AutoserviceSpacing.Xs),
                color = AutoserviceColors.InkMuted,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
fun StatusChip(
    text: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    tone: StatusTone = StatusTone.PRIMARY,
    iconContentDescription: String? = null,
) {
    Surface(
        modifier = modifier,
        shape = AutoserviceShape,
        color = AutoserviceColors.Surface,
        contentColor = tone.color,
        border = BorderStroke(1.dp, tone.color),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = AutoserviceSpacing.Sm, vertical = AutoserviceSpacing.Xs),
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = iconContentDescription,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = text,
                modifier = Modifier.weight(1f, fill = false),
                style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}
