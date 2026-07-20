package com.chengxu.autoservice.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource

@Composable
fun OfflineBanner(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(color = AutoserviceColors.OfflineBannerBackground)
            .padding(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
    ) {
        BrandIcon(
            resource = BrandIconResource.Offline,
            contentDescription = null,
            tint = AutoserviceColors.Warning,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = "网络不可用，当前为只读模式",
            color = AutoserviceColors.Ink,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
