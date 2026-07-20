package com.chengxu.autoservice.core.orders.cache

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.security.StringCipher
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FoundationDaoTest {
    private lateinit var database: AutoserviceDatabase
    private lateinit var dao: FoundationDao
    private lateinit var store: EncryptedOrderStore

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AutoserviceDatabase::class.java).build()
        dao = database.foundationDao()
        store = EncryptedOrderStore(dao, PrefixCipher())
    }

    @After
    fun tearDown() = database.close()

    @Test
    fun detailRoundTripsWithEncryptedPhoneAndVinAndCompanyIsolation() = runTest {
        store.upsertDetail(detail("tongda", "RO-1"))

        val raw = requireNotNull(dao.getDetail("tongda", "RO-1"))
        assertNotEquals("15000000000", raw.encryptedPhone)
        assertNotEquals("VIN-001", raw.encryptedVin)
        assertEquals("15000000000", store.getDetail("tongda", "RO-1")?.phone)
        assertNull(store.getDetail("xinqiheng", "RO-1"))
    }

    @Test
    fun corruptEncryptedDetailIsDeletedWithoutEscaping() = runTest {
        store.upsertDetail(detail("tongda", "RO-1"))
        dao.upsertDetail(requireNotNull(dao.getDetail("tongda", "RO-1")).copy(encryptedPhone = "bad"))

        assertNull(store.getDetail("tongda", "RO-1"))
        assertNull(dao.getDetail("tongda", "RO-1"))
    }

    @Test
    fun draftPayloadAndCursorUpsertRemainCompanyScoped() = runTest {
        store.upsertDraft(OrderDraft("D-1", "tongda", null, null, "{\"phone\":\"150\"}", 10L))
        dao.upsertCursor(SyncCursorEntity("tongda", "orders-current", "cursor-1", "server-1", 10L))
        dao.upsertCursor(SyncCursorEntity("tongda", "orders-current", "cursor-2", "server-2", 20L))

        val draft = dao.observeDrafts("tongda").first().single()
        assertNotEquals("{\"phone\":\"150\"}", draft.encryptedPayload)
        assertEquals("cursor-2", dao.getCursor("tongda", "orders-current")?.cursor)
        assertNull(dao.getCursor("xinqiheng", "orders-current"))
    }

    @Test
    fun companyAndGlobalClearCoverEveryFoundationTable() = runTest {
        for (company in listOf("tongda", "xinqiheng")) {
            store.upsertDetail(detail(company, "RO-$company"))
            store.upsertDraft(OrderDraft("D-$company", company, null, null, "{}", 1L))
            dao.upsertCursor(SyncCursorEntity(company, "orders", "cursor", "server", 1L))
            dao.upsertVehicles(listOf(CustomerVehicleEntity(company, "V-1", "encrypted", "now")))
            dao.upsertPolicies(listOf(InsurancePolicyEntity(company, "P-1", "encrypted", "now")))
        }

        dao.deleteFoundationByCompany("tongda")
        assertNull(dao.getDetail("tongda", "RO-tongda"))
        assertEquals(0, dao.observeDrafts("tongda").first().size)
        assertEquals("xinqiheng", dao.getDetail("xinqiheng", "RO-xinqiheng")?.companyId)

        dao.clearAllFoundation()
        assertNull(dao.getDetail("xinqiheng", "RO-xinqiheng"))
        assertEquals(0, dao.observeDrafts("xinqiheng").first().size)
        assertNull(dao.getCursor("xinqiheng", "orders"))
    }

    private fun detail(companyId: String, orderId: String) = OrderDetail(
        summary = OrderSummary(
            orderId, companyId, 2, "2026-07-20", "2026-07-20", "09:30", "蒙K·A3816",
            "张先生", "大众帕萨特", "常规保养", "在修中", 30_000, "维修记录", "", "", "now",
        ),
        phone = "15000000000", insurer = "人保", staff = "张工", vin = "VIN-001",
        claimNo = "", accidentType = "常规维修", paymentMethod = "待确认", remark = "",
        laborCents = 10_000, materialCents = 20_000, settlementDate = "", settlementTime = "",
        settlementRemark = "", receipt = null, voided = false, voidedAt = "", voidReason = "",
    )

    private class PrefixCipher : StringCipher {
        override fun encrypt(plaintext: String): String = "enc:$plaintext"
        override fun decrypt(ciphertext: String): String =
            ciphertext.removePrefix("enc:").takeIf { ciphertext.startsWith("enc:") }
                ?: error("corrupt")
    }
}
