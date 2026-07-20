package com.chengxu.autoservice.core.orders.cache

import com.chengxu.autoservice.core.orders.OrderCache
import com.chengxu.autoservice.core.orders.RepairOrder
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class RoomOrderCache(
    private val orderDao: OrderDao,
) : OrderCache {
    override fun observe(companyId: String): Flow<List<RepairOrder>> =
        orderDao.observeByCompany(companyId).map { rows -> rows.map(OrderEntity::toDomain) }

    override suspend fun replace(companyId: String, orders: List<RepairOrder>) {
        orderDao.replaceCompany(
            companyId = companyId,
            orders = orders.map { it.toEntity(trustedCompanyId = companyId) },
        )
    }

    override suspend fun clear() {
        orderDao.clearAll()
    }
}

private fun RepairOrder.toEntity(trustedCompanyId: String) = OrderEntity(
    companyId = trustedCompanyId,
    orderId = id,
    date = date,
    dateSortKey = dateSortKey,
    time = time,
    plate = plate,
    customer = customer,
    car = car,
    type = type,
    status = status,
    amountCents = amountCents,
    record = record,
    insuranceExpiry = insuranceExpiry,
    delivery = delivery,
)

private fun OrderEntity.toDomain() = RepairOrder(
    id = orderId,
    companyId = companyId,
    date = date,
    dateSortKey = dateSortKey,
    time = time,
    plate = plate,
    customer = customer,
    car = car,
    type = type,
    status = status,
    amountCents = amountCents,
    record = record,
    insuranceExpiry = insuranceExpiry,
    delivery = delivery,
)
