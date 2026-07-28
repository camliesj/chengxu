package com.chengxu.autoservice.core.orders.cache

import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.OrderCreationLocalStore
import com.chengxu.autoservice.core.orders.OrderDetailLocalStore
import com.chengxu.autoservice.core.orders.OrderEditLocalStore
import com.chengxu.autoservice.core.orders.OrderStatusLocalStore
import com.chengxu.autoservice.core.orders.CustomerVehicleCache
import com.chengxu.autoservice.core.orders.CustomerVehicleRecord
import com.chengxu.autoservice.core.orders.InsurancePolicyRecord
import com.chengxu.autoservice.core.orders.InsurancePolicyCache
import com.chengxu.autoservice.core.security.StringCipher
import com.chengxu.autoservice.core.orders.model.PendingStatusEnvelope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

class EncryptedOrderStore(
    private val dao: FoundationDao,
    private val cipher: StringCipher,
) : OrderCreationLocalStore, OrderEditLocalStore, OrderStatusLocalStore, CustomerVehicleCache, InsurancePolicyCache {
    override suspend fun upsertDetail(detail: OrderDetail) = dao.upsertDetail(detail.toEntity(cipher))

    override suspend fun getDetail(companyId: String, orderId: String): OrderDetail? {
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

    override suspend fun deleteDetail(companyId: String, orderId: String) =
        dao.deleteDetail(companyId, orderId)

    suspend fun upsertDraft(draft: OrderDraft) = dao.upsertDraft(
        draft.toEntity(cipher),
    )

    suspend fun getDraft(companyId: String, localId: String): OrderDraft? =
        dao.getDraft(companyId, localId)?.decryptOrDelete()

    suspend fun getEditDraft(companyId: String, orderId: String): OrderDraft? =
        getDraft(companyId, editDraftId(orderId))

    suspend fun replaceEditDraft(draft: OrderDraft) {
        require(draft.localId == editDraftId(requireNotNull(draft.baseOrderId)))
        dao.replaceEditDraft(draft.toEntity(cipher))
    }

    suspend fun deleteEditDraft(companyId: String, orderId: String) =
        dao.deleteDraft(companyId, editDraftId(orderId))

    override suspend fun getLatestCreateDraft(companyId: String): OrderDraft? =
        dao.getLatestCreateDraft(companyId)?.decryptOrDelete()

    override fun observeCreateDraft(companyId: String): Flow<OrderDraft?> =
        dao.observeCreateDraft(companyId).map { entity -> entity?.decryptOrDelete() }

    override suspend fun replaceCreateDraft(draft: OrderDraft) {
        require(draft.baseOrderId == null) { "Create draft cannot reference an existing order" }
        dao.replaceCreateDraft(draft.toEntity(cipher))
    }

    override suspend fun deleteCreateDraft(companyId: String) = dao.deleteCreateDraft(companyId)

    override fun observeDraft(companyId: String, orderId: String): Flow<OrderDraft?> =
        dao.observeDraft(companyId, editDraftId(orderId)).map { entity -> entity?.decryptOrDelete() }

    override suspend fun save(companyId: String, orderId: String, draft: OrderDraft) {
        require(draft.companyId == companyId && draft.localId == editDraftId(orderId) && draft.baseOrderId == orderId)
        replaceEditDraft(draft)
    }

    override suspend fun deleteDraft(companyId: String, orderId: String) = deleteEditDraft(companyId, orderId)

    override suspend fun getPendingStatus(companyId: String, orderId: String): PendingStatusEnvelope? =
        getDraft(companyId, statusDraftId(orderId))?.let { draft ->
            try {
                Json.decodeFromString<PendingStatusEnvelope>(draft.payloadJson)
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (_: Exception) {
                dao.deleteDraft(companyId, draft.localId)
                null
            }
        }

    override suspend fun savePending(companyId: String, envelope: PendingStatusEnvelope) {
        dao.upsertDraft(OrderDraft(
            localId = statusDraftId(envelope.orderId),
            companyId = companyId,
            baseOrderId = envelope.orderId,
            expectedVersion = envelope.expectedVersion,
            payloadJson = Json.encodeToString(envelope),
            updatedAtMillis = envelope.createdAtMillis,
        ).toEntity(cipher))
    }

    override suspend fun deletePendingStatus(companyId: String, orderId: String) =
        dao.deleteDraft(companyId, statusDraftId(orderId))

    override fun observeVehicles(companyId: String): Flow<List<CustomerVehicleRecord>> =
        dao.observeVehicles(companyId).map { rows ->
            rows.mapNotNull { entity -> entity.decryptOrDeleteVehicle() }
        }

    override suspend fun replaceVehicles(companyId: String, records: List<CustomerVehicleRecord>) {
        require(records.all { it.companyId == companyId }) { "Customer vehicle company mismatch" }
        val updatedAt = System.currentTimeMillis().toString()
        dao.replaceVehicles(companyId, records.map { it.toEntity(cipher, updatedAt) })
    }

    override suspend fun clear() {
        dao.clearVehicles()
        dao.clearPolicies()
    }

    private suspend fun OrderDraftEntity.decryptOrDelete(): OrderDraft? = try {
        toDomain(cipher)
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: Exception) {
        dao.deleteDraft(companyId, localId)
        null
    }

    private suspend fun CustomerVehicleEntity.decryptOrDeleteVehicle(): CustomerVehicleRecord? = try {
        Json.decodeFromString<CustomerVehicleRecord>(cipher.decrypt(encryptedPayload))
            .takeIf { it.id == recordId && it.companyId == companyId }
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: Exception) {
        dao.deleteVehicle(companyId, recordId)
        null
    }

    override fun observePolicies(companyId: String): Flow<List<InsurancePolicyRecord>> =
        dao.observePolicies(companyId).map { rows -> rows.mapNotNull { entity ->
            try { Json.decodeFromString<InsurancePolicyRecord>(cipher.decrypt(entity.encryptedPayload)) }
            catch (_: Exception) { null }
        } }

    override suspend fun replacePolicies(companyId: String, records: List<InsurancePolicyRecord>) {
        require(records.all { it.companyId == companyId })
        dao.replacePolicies(companyId, records.map { record -> InsurancePolicyEntity(
            companyId, record.id, cipher.encrypt(Json.encodeToString(record)), record.updatedAt,
        ) })
    }
}

private fun editDraftId(orderId: String) = "edit:$orderId"
private fun statusDraftId(orderId: String) = "status:$orderId"

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

private fun CustomerVehicleRecord.toEntity(cipher: StringCipher, updatedAt: String) = CustomerVehicleEntity(
    companyId = companyId,
    recordId = id,
    encryptedPayload = cipher.encrypt(Json.encodeToString(this)),
    updatedAt = updatedAt,
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
        ReceiptMetadata(name = receiptName, contentType = receiptContentType, sizeBytes = receiptSizeBytes, uploadedAt = receiptUploadedAt)
    },
    voided = voided, voidedAt = voidedAt, voidReason = voidReason,
)
