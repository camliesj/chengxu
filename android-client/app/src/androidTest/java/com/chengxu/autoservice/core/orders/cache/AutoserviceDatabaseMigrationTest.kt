package com.chengxu.autoservice.core.orders.cache

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AutoserviceDatabaseMigrationTest {
    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AutoserviceDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory(),
    )

    @Test
    fun migrationOneToTwoPreservesLegacySummaryWithSafeDefaults() {
        helper.createDatabase(DATABASE_NAME, 1).apply {
            execSQL(
                """INSERT INTO orders (
                    companyId, orderId, date, dateSortKey, time, plate, customer, car, type,
                    status, amountCents, record, insuranceExpiry, delivery
                ) VALUES ('tongda', 'RO-1', '2026-07-20', '2026-07-20', '09:30', '蒙K·A3816',
                    '张先生', '大众帕萨特', '常规保养', '在修中', 30000, '维修记录', '2026-08-01', '')""",
            )
            close()
        }

        helper.runMigrationsAndValidate(DATABASE_NAME, 2, true, MIGRATION_1_2).use { database ->
            database.query(
                "SELECT companyId, orderId, scope, version, updatedAt FROM order_summaries",
            ).use { cursor ->
                cursor.moveToFirst()
                assertEquals("tongda", cursor.getString(0))
                assertEquals("RO-1", cursor.getString(1))
                assertEquals("CURRENT", cursor.getString(2))
                assertEquals(1L, cursor.getLong(3))
                assertEquals("", cursor.getString(4))
            }
        }
    }

    private companion object {
        const val DATABASE_NAME = "migration-test"
    }
}
