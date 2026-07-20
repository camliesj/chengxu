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
        "SELECT * FROM orders WHERE companyId = :companyId " +
            "ORDER BY dateSortKey DESC, time DESC, orderId DESC",
    )
    fun observeByCompany(companyId: String): Flow<List<OrderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<OrderEntity>)

    @Query("DELETE FROM orders WHERE companyId = :companyId")
    suspend fun deleteByCompany(companyId: String)

    @Query("DELETE FROM orders")
    suspend fun clearAll()

    @Transaction
    suspend fun replaceCompany(companyId: String, orders: List<OrderEntity>) {
        deleteByCompany(companyId)
        insertAll(orders)
    }
}
