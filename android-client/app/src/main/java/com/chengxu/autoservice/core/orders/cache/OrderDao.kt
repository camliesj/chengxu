package com.chengxu.autoservice.core.orders.cache

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query(
        "SELECT * FROM order_summaries WHERE companyId = :companyId " +
            "ORDER BY dateSortKey DESC, time DESC, orderId DESC",
    )
    fun observeByCompany(companyId: String): Flow<List<OrderSummaryEntity>>

    @Query(
        "SELECT * FROM order_summaries WHERE companyId = :companyId AND scope = :scope " +
            "ORDER BY dateSortKey DESC, time DESC, orderId DESC",
    )
    fun observeByCompanyAndScope(companyId: String, scope: String): Flow<List<OrderSummaryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<OrderSummaryEntity>)

    @Query("DELETE FROM order_summaries WHERE companyId = :companyId")
    suspend fun deleteByCompany(companyId: String)

    @Query("DELETE FROM order_summaries")
    suspend fun clearAll()

    @Transaction
    suspend fun replaceCompany(companyId: String, orders: List<OrderSummaryEntity>) {
        deleteByCompany(companyId)
        insertAll(orders)
    }
}
