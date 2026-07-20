package com.chengxu.autoservice.core.designsystem

import androidx.annotation.DrawableRes
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import com.chengxu.autoservice.R

enum class BrandIconResource(@param:DrawableRes val drawableRes: Int) {
    Add(R.drawable.brand_icon_add),
    ArrowRight(R.drawable.brand_icon_arrow_right),
    Building(R.drawable.brand_icon_building),
    Calendar(R.drawable.brand_icon_calendar),
    Car(R.drawable.brand_icon_car),
    Check(R.drawable.brand_icon_check),
    ChevronDown(R.drawable.brand_icon_chevron_down),
    Close(R.drawable.brand_icon_close),
    Cloud(R.drawable.brand_icon_cloud),
    Eye(R.drawable.brand_icon_eye),
    EyeOff(R.drawable.brand_icon_eye_off),
    Home(R.drawable.brand_icon_home),
    Lock(R.drawable.brand_icon_lock),
    Logout(R.drawable.brand_icon_logout),
    Offline(R.drawable.brand_icon_offline),
    Orders(R.drawable.brand_icon_orders),
    Profile(R.drawable.brand_icon_profile),
    Records(R.drawable.brand_icon_records),
    Refresh(R.drawable.brand_icon_refresh),
    Shield(R.drawable.brand_icon_shield),
    Tools(R.drawable.brand_icon_tools),
    User(R.drawable.brand_icon_user),
    Wallet(R.drawable.brand_icon_wallet),
    Warning(R.drawable.brand_icon_warning),
}

@Composable
fun BrandIcon(
    resource: BrandIconResource,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    tint: Color = AutoserviceColors.Ink,
) {
    Icon(
        painter = painterResource(resource.drawableRes),
        contentDescription = contentDescription,
        modifier = modifier,
        tint = tint,
    )
}
