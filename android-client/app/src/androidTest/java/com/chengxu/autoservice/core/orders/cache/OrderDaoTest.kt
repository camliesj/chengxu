package com.chengxu.autoservice.core.orders.cache

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OrderDaoTest {
    private lateinit var database: AutoserviceDatabase
    private lateinit var dao: OrderDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AutoserviceDatabase::class.java).build()
        dao = database.orderDao()
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun rowsAreSortedByDateTimeAndStableIdDescending() = runTest {
        dao.replaceCompany(
            companyId = "tongda",
            orders = listOf(
                entity("A-1", "tongda", "2026-07-18", "08:00"),
                entity("A-3", "tongda", "2026-07-17", "11:00"),
                entity("A-2", "tongda", "2026-07-18", "10:00"),
            ),
        )

        assertEquals(
            listOf("A-2", "A-1", "A-3"),
            dao.observeByCompany("tongda").first().map { it.orderId },
        )
    }

    @Test
    fun replaceIsAtomicAndCompanyScoped() = runTest {
        dao.replaceCompany("tongda", listOf(entity("A-1", "tongda", "2026-07-16", "08:00")))
        dao.replaceCompany("xinqiheng", listOf(entity("B-1", "xinqiheng", "2026-07-17", "09:00")))
        dao.replaceCompany("tongda", listOf(entity("A-2", "tongda", "2026-07-18", "10:00")))

        assertEquals(listOf("A-2"), dao.observeByCompany("tongda").first().map { it.orderId })
        assertEquals(listOf("B-1"), dao.observeByCompany("xinqiheng").first().map { it.orderId })
    }

    @Test
    fun scopeQueriesKeepCurrentAndHistoryIsolated() = runTest {
        dao.insertAll(
            listOf(
                entity("A-1", "tongda", "2026-07-18", "08:00", scope = "CURRENT"),
                entity("A-2", "tongda", "2026-07-18", "09:00", scope = "HISTORY"),
                entity("B-1", "xinqiheng", "2026-07-18", "10:00", scope = "CURRENT"),
            ),
        )

        assertEquals(
            listOf("A-1"),
            dao.observeByCompanyAndScope("tongda", "CURRENT").first().map { it.orderId },
        )
        assertEquals(
            listOf("A-2"),
            dao.observeByCompanyAndScope("tongda", "HISTORY").first().map { it.orderId },
        )
    }

    @Test
    fun clearAllRemovesEveryCompany() = runTest {
        dao.replaceCompany("tongda", listOf(entity("A-1", "tongda", "2026-07-16", "08:00")))
        dao.replaceCompany("xinqiheng", listOf(entity("B-1", "xinqiheng", "2026-07-17", "09:00")))

        dao.clearAll()

        assertEquals(emptyList<OrderSummaryEntity>(), dao.observeByCompany("tongda").first())
        assertEquals(emptyList<OrderSummaryEntity>(), dao.observeByCompany("xinqiheng").first())
    }

    private fun entity(
        orderId: String,
        companyId: String,
        dateSortKey: String,
        time: String,
        scope: String = "CURRENT",
    ) = OrderSummaryEntity(
        companyId = companyId,
        orderId = orderId,
        scope = scope,
        version = 1,
        date = dateSortKey,
        dateSortKey = dateSortKey,
        time = time,
        plate = "蒙K·A3816",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = "在修中",
        amountCents = 304_000,
        record = "更换机油和机滤",
        insuranceExpiry = "2026-08-01",
        delivery = "2026-07-18 18:00",
        updatedAt = "",
    )
}
