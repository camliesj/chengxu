package com.chengxu.autoservice.ui.create

import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.InsurancePoliciesDataSource
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope

/** Refreshes server-provisioned archives without allowing one failed archive read to block the other. */
suspend fun refreshCreatedOrderArchives(
    customerVehicles: CustomerVehiclesDataSource,
    insurancePolicies: InsurancePoliciesDataSource,
) = supervisorScope {
    launch { runCatching { customerVehicles.refresh() } }
    launch { runCatching { insurancePolicies.refresh() } }
}
