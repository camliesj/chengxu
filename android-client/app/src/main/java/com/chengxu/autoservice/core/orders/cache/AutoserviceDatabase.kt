package com.chengxu.autoservice.core.orders.cache

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [OrderEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class AutoserviceDatabase : RoomDatabase() {
    abstract fun orderDao(): OrderDao

    companion object {
        private const val DATABASE_NAME = "autoservice.db"

        fun create(context: Context): AutoserviceDatabase = Room.databaseBuilder(
            context = context.applicationContext,
            klass = AutoserviceDatabase::class.java,
            name = DATABASE_NAME,
        ).build()
    }
}
