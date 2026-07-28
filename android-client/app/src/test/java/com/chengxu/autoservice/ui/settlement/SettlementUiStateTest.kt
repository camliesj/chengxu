package com.chengxu.autoservice.ui.settlement

import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SettlementUiStateTest {
    @Test
    fun receiptManagementRequiresSettledStatusMetadataKeyAndServerCapability() {
        val allowed = SettlementUiState(
            detail = detail(),
            capabilities = setOf(BusinessCapability.MAINTAIN_RECEIPT),
            receiptKey = "receipt-key",
        )

        assertTrue(allowed.isReceiptManagement)
        assertTrue(allowed.canManageReceipt)
        assertFalse(allowed.copy(receiptKey = null).canManageReceipt)
        assertFalse(allowed.copy(capabilities = emptySet()).canManageReceipt)
        assertFalse(allowed.copy(detail = detail(OrderStatus.PENDING_SETTLEMENT)).canManageReceipt)
    }

    private fun detail(status: OrderStatus = OrderStatus.SETTLED) = OrderDetail(
        summary = OrderSummary("RO-1", "tongda", 4, "2026-07-28", "2026-07-28", "10:00", "A-1", "Customer", "Car", "Type", status.wireValue, 300, "Record", "2027-01-01", "Tomorrow", "now"),
        phone = "", insurer = "", staff = "", vin = "", claimNo = "", accidentType = "", paymentMethod = "现金", remark = "",
        laborCents = 100, materialCents = 200, settlementDate = "2026-07-28", settlementTime = "10:00", settlementRemark = "",
        receipt = ReceiptMetadata("receipt.png", "image/png", 128, "now"), voided = false, voidedAt = "", voidReason = "",
    )
}
