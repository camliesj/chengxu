package com.chengxu.autoservice.ui.edit

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.ui.create.CreateOrderField
import com.chengxu.autoservice.ui.create.CreateOrderFields
import com.chengxu.autoservice.ui.create.CreateOrderStep

typealias EditOrderField = CreateOrderField
typealias EditOrderFields = CreateOrderFields
typealias EditOrderStep = CreateOrderStep

enum class EditSubmitState { IDLE, SUBMITTING, CONFIRMING, CONFLICT }

data class EditOrderUiState(
    val loading: Boolean = true,
    val orderId: String = "",
    val step: EditOrderStep = EditOrderStep.CUSTOMER,
    val fields: EditOrderFields = EditOrderFields(),
    val metadata: OrderCreationMetadata? = null,
    val expectedVersion: Long = 0L,
    val connection: ConnectionState = ConnectionState.Offline,
    val canEdit: Boolean = false,
    val submitState: EditSubmitState = EditSubmitState.IDLE,
    val operationId: String? = null,
    val latest: OrderDetail? = null,
    val conflictingFields: Set<String> = emptySet(),
    val dirty: Boolean = false,
    val message: String? = null,
)

sealed interface EditOrderEvent {
    data class Saved(val orderId: String) : EditOrderEvent
    data object Exit : EditOrderEvent
}
