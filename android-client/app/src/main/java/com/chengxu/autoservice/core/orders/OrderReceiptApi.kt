package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.ReceiptReference

data class ReceiptUpload(
    val name: String,
    val contentType: String,
    val bytes: ByteArray,
)

data class ReceiptDownload(
    val contentType: String,
    val bytes: ByteArray,
)

sealed interface ReceiptOperationResult<out T> {
    data class Success<T>(val value: T) : ReceiptOperationResult<T>
    data class ValidationFailure(val error: String) : ReceiptOperationResult<Nothing>
    data object Unauthorized : ReceiptOperationResult<Nothing>
    data object Forbidden : ReceiptOperationResult<Nothing>
    data object NotFound : ReceiptOperationResult<Nothing>
    data object NetworkUnavailable : ReceiptOperationResult<Nothing>
    data object MalformedResponse : ReceiptOperationResult<Nothing>
}

interface OrderReceiptApi {
    suspend fun upload(token: String, orderId: String, upload: ReceiptUpload): ReceiptOperationResult<ReceiptReference>
    suspend fun download(token: String, key: String): ReceiptOperationResult<ReceiptDownload>
    suspend fun delete(token: String, key: String, orderId: String): ReceiptOperationResult<Unit>
}
