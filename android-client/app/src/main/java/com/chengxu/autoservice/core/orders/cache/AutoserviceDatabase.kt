package com.chengxu.autoservice.core.orders.cache

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        OrderSummaryEntity::class,
        OrderDetailEntity::class,
        OrderDraftEntity::class,
        SyncCursorEntity::class,
        CustomerVehicleEntity::class,
        InsurancePolicyEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class AutoserviceDatabase : RoomDatabase() {
    abstract fun orderDao(): OrderDao
    abstract fun foundationDao(): FoundationDao

    companion object {
        private const val DATABASE_NAME = "autoservice.db"

        fun create(context: Context): AutoserviceDatabase = Room.databaseBuilder(
            context = context.applicationContext,
            klass = AutoserviceDatabase::class.java,
            name = DATABASE_NAME,
        ).addMigrations(MIGRATION_1_2).build()
    }
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS `order_summaries` (
                `companyId` TEXT NOT NULL, `orderId` TEXT NOT NULL, `scope` TEXT NOT NULL,
                `version` INTEGER NOT NULL, `date` TEXT NOT NULL, `dateSortKey` TEXT NOT NULL,
                `time` TEXT NOT NULL, `plate` TEXT NOT NULL, `customer` TEXT NOT NULL,
                `car` TEXT NOT NULL, `type` TEXT NOT NULL, `status` TEXT NOT NULL,
                `amountCents` INTEGER NOT NULL, `record` TEXT NOT NULL,
                `insuranceExpiry` TEXT NOT NULL, `delivery` TEXT NOT NULL,
                `updatedAt` TEXT NOT NULL, PRIMARY KEY(`companyId`, `orderId`))""",
        )
        db.execSQL(
            """INSERT INTO `order_summaries` (
                companyId, orderId, scope, version, date, dateSortKey, time, plate, customer,
                car, type, status, amountCents, record, insuranceExpiry, delivery, updatedAt
            ) SELECT companyId, orderId, 'CURRENT', 1, date, dateSortKey, time, plate, customer,
                car, type, status, amountCents, record, insuranceExpiry, delivery, '' FROM `orders`""",
        )
        db.execSQL("DROP TABLE `orders`")
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS `index_order_summaries_companyId_scope_dateSortKey_time` " +
                "ON `order_summaries` (`companyId`, `scope`, `dateSortKey`, `time`)",
        )
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS `order_details` (
                `companyId` TEXT NOT NULL, `orderId` TEXT NOT NULL, `version` INTEGER NOT NULL,
                `date` TEXT NOT NULL, `dateSortKey` TEXT NOT NULL, `time` TEXT NOT NULL,
                `plate` TEXT NOT NULL, `customer` TEXT NOT NULL, `car` TEXT NOT NULL,
                `type` TEXT NOT NULL, `status` TEXT NOT NULL, `amountCents` INTEGER NOT NULL,
                `record` TEXT NOT NULL, `insuranceExpiry` TEXT NOT NULL, `delivery` TEXT NOT NULL,
                `updatedAt` TEXT NOT NULL, `encryptedPhone` TEXT NOT NULL, `insurer` TEXT NOT NULL,
                `staff` TEXT NOT NULL, `encryptedVin` TEXT NOT NULL, `claimNo` TEXT NOT NULL,
                `accidentType` TEXT NOT NULL, `paymentMethod` TEXT NOT NULL, `remark` TEXT NOT NULL,
                `laborCents` INTEGER NOT NULL, `materialCents` INTEGER NOT NULL,
                `settlementDate` TEXT NOT NULL, `settlementTime` TEXT NOT NULL,
                `settlementRemark` TEXT NOT NULL, `receiptName` TEXT NOT NULL,
                `receiptContentType` TEXT NOT NULL, `receiptSizeBytes` INTEGER NOT NULL,
                `receiptUploadedAt` TEXT NOT NULL, `voided` INTEGER NOT NULL,
                `voidedAt` TEXT NOT NULL, `voidReason` TEXT NOT NULL,
                PRIMARY KEY(`companyId`, `orderId`))""",
        )
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS `order_drafts` (
                `companyId` TEXT NOT NULL, `localId` TEXT NOT NULL, `baseOrderId` TEXT,
                `expectedVersion` INTEGER, `encryptedPayload` TEXT NOT NULL,
                `updatedAtMillis` INTEGER NOT NULL, PRIMARY KEY(`companyId`, `localId`))""",
        )
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS `sync_cursors` (
                `companyId` TEXT NOT NULL, `resource` TEXT NOT NULL, `cursor` TEXT NOT NULL,
                `serverTime` TEXT NOT NULL, `updatedAtMillis` INTEGER NOT NULL,
                PRIMARY KEY(`companyId`, `resource`))""",
        )
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS `customer_vehicles` (
                `companyId` TEXT NOT NULL, `recordId` TEXT NOT NULL,
                `encryptedPayload` TEXT NOT NULL, `updatedAt` TEXT NOT NULL,
                PRIMARY KEY(`companyId`, `recordId`))""",
        )
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS `insurance_policies` (
                `companyId` TEXT NOT NULL, `recordId` TEXT NOT NULL,
                `encryptedPayload` TEXT NOT NULL, `updatedAt` TEXT NOT NULL,
                PRIMARY KEY(`companyId`, `recordId`))""",
        )
    }
}
