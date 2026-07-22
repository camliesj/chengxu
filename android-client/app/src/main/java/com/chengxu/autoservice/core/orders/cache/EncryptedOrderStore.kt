package com.chengxu.autoservice.core.orders.cache

import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.OrderCreationLocalStore
import com.chengxu.autoservice.core.security.StringCipher
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class EncryptedOrderStore(
    private val dao: FoundationDao,
    private val cipher: StringCipher,
) : OrderCreationLocalStore {
    override suspend fun upsertDetail(detail: OrderDetail) = dao.upsertDetail(detail.toEntity(cipher))

    suspend fun getDetail(companyId: String, orderId: String): OrderDetail? {
        val entity = dao.getDetail(companyId, orderId) ?: return null
        return try {
            entity.toDomain(cipher)
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (_: Exception) {
            dao.deleteDetail(companyId, orderId)
            null
        }
    }

    suspend fun upsertDraft(draft: OrderDraft) = dao.upsertDraft(
        draft.toEntity(cipher),
    )

    override suspend fun getLatestCreateDraft(companyId: String): OrderDraft? =
        dao.getLatestCreateDraft(companyId)?.decryptOrDelete()

    override fun observeCreateDraft(companyId: String): Flow<OrderDraft?> =
        dao.observeCreateDraft(companyId).map { entity -> entity?.decryptOrDelete() }

    override suspend fun replaceCreateDraft(draft: OrderDraft) {
        require(draft.baseOrderId == null) { "Create draft cannot reference an existing order" }
        dao.replaceCreateDraft(draft.toEntity(cipher))
    }

    override suspend fun deleteCreateDraft(companyId: String) = dao.deleteCreateDraft(companyId)

    private suspend fun OrderDraftEntity.decryptOrDelete(): OrderDraft? = try {
        toDomain(cipher)
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: Exception) {
        dao.deleteDraft(companyId, localId)
        null
    }
}

private fun OrderDraft.toEntity(cipher: StringCipher) = OrderDraftEntity(
    companyId = companyId,
    localId = localId,
    baseOrderId = baseOrderId,
    expectedVersion = expectedVersion,
    encryptedPayload = cipher.encrypt(payloadJson),
    updatedAtMillis = updatedAtMillis,
)

private fun OrderDraftEntity.toDomain(cipher: StringCipher) = OrderDraft(
    localId = localId,
    companyId = companyId,
    baseOrderId = baseOrderId,
    expectedVersion = expectedVersion,
    payloadJson = cipher.decrypt(encryptedPayload),
    updatedAtMillis = updatedAtMillis,
)

private fun OrderDetail.toEntity(cipher: StringCipher) = OrderDetailEntity(
    companyId = summary.companyId, orderId = summary.id, version = summary.version,
    date = summary.date, dateSortKey = summary.dateSortKey, time = summary.time,
    plate = summary.plate, customer = summary.customer, car = summary.car, type = summary.type,
    status = summary.status, amountCents = summary.amountCents, record = summary.record,
    insuranceExpiry = summary.insuranceExpiry, delivery = summary.delivery,
    updatedAt = summary.updatedAt, encryptedPhone = cipher.encrypt(phone), insurer = insurer,
    staff = staff, encryptedVin = cipher.encrypt(vin), claimNo = claimNo,
    accidentType = accidentType, paymentMethod = paymentMethod, remark = remark,
    laborCents = laborCents, materialCents = materialCents, settlementDate = settlementDate,
    settlementTime = settlementTime, settlementRemark = settlementRemark,
    receiptName = receipt?.name.orEmpty(), receiptContentType = receipt?.contentType.orEmpty(),
    receiptSizeBytes = receipt?.sizeBytes ?: 0L, receiptUploadedAt = receipt?.uploadedAt.orEmpty(),
    voided = voided, voidedAt = voidedAt, voidReason = voidReason,
)

private fun OrderDetailEntity.toDomain(cipher: StringCipher): OrderDetail = OrderDetail(
    summary = OrderSummary(
        id = orderId, companyId = companyId, version = version, date = date,
        dateSortKey = dateSortKey, time = time, plate = plate, customer = customer, car = car,
        type = type, status = status, amountCents = amountCents, record = record,
        insuranceExpiry = insuranceExpiry, delivery = delivery, updatedAt = updatedAt,
    ),
    phone = cipher.decrypt(encryptedPhone), insurer = insurer, staff = staff,
    vin = cipher.decrypt(encryptedVin), claimNo = claimNo, accidentType = accidentType,
    paymentMethod = paymentMethod, remark = remark, laborCents = laborCents,
    materialCents = materialCents, settlementDate = settlementDate, settlementTime = settlementTime,
    settlementRemark = settlementRemark,
    receipt = receiptName.takeIf(String::isNotEmpty)?.let {
        ReceiptMetadata(receiptName, receiptContentType, receiptSizeBytes, receiptUploadedAt)
    },
    voided = voided, voidedAt = voidedAt, voidReason = voidReason,
)
