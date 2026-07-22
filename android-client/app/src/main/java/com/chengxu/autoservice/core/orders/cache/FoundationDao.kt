package com.chengxu.autoservice.core.orders.cache

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface FoundationDao {
    @Query("SELECT * FROM order_details WHERE companyId = :companyId AND orderId = :orderId")
    suspend fun getDetail(companyId: String, orderId: String): OrderDetailEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDetail(entity: OrderDetailEntity)
    @Query("DELETE FROM order_details WHERE companyId = :companyId AND orderId = :orderId")
    suspend fun deleteDetail(companyId: String, orderId: String)

    @Query("SELECT * FROM order_drafts WHERE companyId = :companyId ORDER BY updatedAtMillis DESC")
    fun observeDrafts(companyId: String): Flow<List<OrderDraftEntity>>
    @Query(
        "SELECT * FROM order_drafts WHERE companyId = :companyId AND baseOrderId IS NULL " +
            "ORDER BY updatedAtMillis DESC LIMIT 1",
    )
    suspend fun getLatestCreateDraft(companyId: String): OrderDraftEntity?
    @Query(
        "SELECT * FROM order_drafts WHERE companyId = :companyId AND baseOrderId IS NULL " +
            "ORDER BY updatedAtMillis DESC LIMIT 1",
    )
    fun observeCreateDraft(companyId: String): Flow<OrderDraftEntity?>
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDraft(entity: OrderDraftEntity)
    @Query("DELETE FROM order_drafts WHERE companyId = :companyId AND localId = :localId")
    suspend fun deleteDraft(companyId: String, localId: String)
    @Query("DELETE FROM order_drafts WHERE companyId = :companyId AND baseOrderId IS NULL")
    suspend fun deleteCreateDraft(companyId: String)

    @Transaction
    suspend fun replaceCreateDraft(entity: OrderDraftEntity) {
        deleteCreateDraft(entity.companyId)
        upsertDraft(entity)
    }

    @Query("SELECT * FROM sync_cursors WHERE companyId = :companyId AND resource = :resource")
    suspend fun getCursor(companyId: String, resource: String): SyncCursorEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCursor(entity: SyncCursorEntity)
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertVehicles(rows: List<CustomerVehicleEntity>)
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertPolicies(rows: List<InsurancePolicyEntity>)

    @Query("DELETE FROM order_details WHERE companyId = :companyId")
    suspend fun deleteDetailsByCompany(companyId: String)
    @Query("DELETE FROM order_drafts WHERE companyId = :companyId")
    suspend fun deleteDraftsByCompany(companyId: String)
    @Query("DELETE FROM sync_cursors WHERE companyId = :companyId")
    suspend fun deleteCursorsByCompany(companyId: String)
    @Query("DELETE FROM customer_vehicles WHERE companyId = :companyId")
    suspend fun deleteVehiclesByCompany(companyId: String)
    @Query("DELETE FROM insurance_policies WHERE companyId = :companyId")
    suspend fun deletePoliciesByCompany(companyId: String)

    @Transaction
    suspend fun deleteFoundationByCompany(companyId: String) {
        deleteDetailsByCompany(companyId)
        deleteDraftsByCompany(companyId)
        deleteCursorsByCompany(companyId)
        deleteVehiclesByCompany(companyId)
        deletePoliciesByCompany(companyId)
    }

    @Query("DELETE FROM order_details") suspend fun clearDetails()
    @Query("DELETE FROM order_drafts") suspend fun clearDrafts()
    @Query("DELETE FROM sync_cursors") suspend fun clearCursors()
    @Query("DELETE FROM customer_vehicles") suspend fun clearVehicles()
    @Query("DELETE FROM insurance_policies") suspend fun clearPolicies()

    @Transaction
    suspend fun clearAllFoundation() {
        clearDetails()
        clearDrafts()
        clearCursors()
        clearVehicles()
        clearPolicies()
    }
}
