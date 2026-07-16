package com.chengxu.autoservice.ui.stage

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing

@Composable
fun StageScreen(
    title: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(AutoserviceSpacing.Lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = title, style = MaterialTheme.typography.headlineSmall)
        Text(
            text = "该模块将在后续阶段接入",
            modifier = Modifier.padding(top = AutoserviceSpacing.Sm),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
