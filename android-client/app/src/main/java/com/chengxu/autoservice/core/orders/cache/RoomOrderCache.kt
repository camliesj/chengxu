package com.chengxu.autoservice.core.orders.cache

import com.chengxu.autoservice.core.orders.OrderCache
import com.chengxu.autoservice.core.orders.OrderCreationSummaryStore
import com.chengxu.autoservice.core.orders.HistoryOrderCache
import com.chengxu.autoservice.core.orders.RepairOrder
import com.chengxu.autoservice.core.orders.model.OrderSummary
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class RoomOrderCache(
    private val orderDao: OrderDao,
) : OrderCache, OrderCreationSummaryStore, HistoryOrderCache {
    override fun observe(companyId: String): Flow<List<RepairOrder>> =
        orderDao.observeByCompany(companyId).map { rows -> rows.map(OrderSummaryEntity::toDomain) }

    override suspend fun replace(companyId: String, orders: List<RepairOrder>) {
        orderDao.replaceCompany(
            companyId = companyId,
            orders = orders.map { it.toEntity(trustedCompanyId = companyId) },
        )
    }

    override suspend fun clear() = orderDao.clearAll()

    override suspend fun upsert(summary: OrderSummary) =
        orderDao.insertAll(listOf(summary.toEntity()))

    override fun observeHistory(companyId: String): Flow<List<OrderSummary>> =
        orderDao.observeByCompanyAndScope(companyId, "HISTORY")
            .map { rows -> rows.map(OrderSummaryEntity::toSummary) }

    override suspend fun replaceHistory(companyId: String, orders: List<OrderSummary>) =
        orderDao.replaceCompanyScope(
            companyId = companyId,
            scope = "HISTORY",
            orders = orders.map { it.toEntity() },
        )

    override suspend fun appendHistory(companyId: String, orders: List<OrderSummary>) =
        orderDao.insertAll(orders.map { it.toEntity() })
}

private fun OrderSummary.toEntity() = OrderSummaryEntity(
    companyId = companyId,
    orderId = id,
    scope = if (status == "已结算") "HISTORY" else "CURRENT",
    version = version,
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
    updatedAt = updatedAt,
)

private fun RepairOrder.toEntity(trustedCompanyId: String) = OrderSummaryEntity(
    companyId = trustedCompanyId,
    orderId = id,
    scope = if (status == "已结算") "HISTORY" else "CURRENT",
    version = 1,
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
    updatedAt = "",
)

private fun OrderSummaryEntity.toDomain() = RepairOrder(
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

private fun OrderSummaryEntity.toSummary() = OrderSummary(
    id = orderId,
    companyId = companyId,
    version = version,
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
    updatedAt = updatedAt,
)
