package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf

interface OrderCreationLocalStore {
    suspend fun getLatestCreateDraft(companyId: String): OrderDraft?
    fun observeCreateDraft(companyId: String): Flow<OrderDraft?>
    suspend fun replaceCreateDraft(draft: OrderDraft)
    suspend fun deleteCreateDraft(companyId: String)
    suspend fun upsertDetail(detail: OrderDetail)
}

fun interface OrderCreationSummaryStore {
    suspend fun upsert(summary: OrderSummary)
}

interface OrderCreationRepository {
    fun observeDraft(): Flow<OrderDraft?>
    suspend fun loadMetadata(): OrderCommandResult<OrderCreationMetadataEnvelope>
    suspend fun saveDraft(payloadJson: String, updatedAtMillis: Long): Boolean
    suspend fun discardDraft()
    suspend fun create(command: OrderCreateCommand): OrderCommandResult<OrderDetail>
    suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail>
}

class DefaultOrderCreationRepository(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val api: OrderCreateApi,
    private val localStore: OrderCreationLocalStore,
    private val summaryStore: OrderCreationSummaryStore,
    private val sessionInvalidator: SessionInvalidator,
) : OrderCreationRepository {
    @Volatile
    private var creationCapability: CreationCapability? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun observeDraft(): Flow<OrderDraft?> =
        sessionRepository.session.flatMapLatest { session ->
            session?.let { localStore.observeCreateDraft(it.companyId) } ?: flowOf(null)
        }

    override suspend fun loadMetadata(): OrderCommandResult<OrderCreationMetadataEnvelope> {
        creationCapability = null
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        val result = api.fetchMetadata(session.token)
        when (result) {
            is OrderCommandResult.Success -> creationCapability = CreationCapability(
                identity = session.identity(),
                canCreate = result.value.canCreate,
            )
            OrderCommandResult.Unauthorized -> handleUnauthorized()
            else -> Unit
        }
        return result
    }

    override suspend fun saveDraft(payloadJson: String, updatedAtMillis: Long): Boolean {
        val session = sessionRepository.session.value ?: return false
        localStore.replaceCreateDraft(
            OrderDraft(
                localId = "create:${session.companyId}",
                companyId = session.companyId,
                baseOrderId = null,
                expectedVersion = null,
                payloadJson = payloadJson,
                updatedAtMillis = updatedAtMillis,
            ),
        )
        return true
    }

    override suspend fun discardDraft() {
        val companyId = sessionRepository.session.value?.companyId ?: return
        localStore.deleteCreateDraft(companyId)
    }

    override suspend fun create(command: OrderCreateCommand): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        val capability = creationCapability
        if (capability?.identity != session.identity() || !capability.canCreate) {
            return OrderCommandResult.Forbidden
        }
        return handleOrderResult(session, api.create(session.token, command))
    }

    override suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        return handleOrderResult(session, api.queryOperation(session.token, operationId))
    }

    private suspend fun handleOrderResult(
        session: AppSession,
        result: OrderCommandResult<OrderDetail>,
    ): OrderCommandResult<OrderDetail> = when (result) {
        is OrderCommandResult.Success -> {
            if (result.value.summary.companyId != session.companyId) {
                OrderCommandResult.MalformedResponse
            } else {
                persistCreatedOrder(result.value)
                result
            }
        }
        OrderCommandResult.Unauthorized -> {
            handleUnauthorized()
            result
        }
        OrderCommandResult.Forbidden -> {
            creationCapability = CreationCapability(session.identity(), canCreate = false)
            result
        }
        else -> result
    }

    private suspend fun persistCreatedOrder(detail: OrderDetail) {
        try {
            localStore.upsertDetail(detail)
            summaryStore.upsert(detail.summary)
            localStore.deleteCreateDraft(detail.summary.companyId)
        } catch (cancellation: CancellationException) {
            throw cancellation
        }
    }

    private suspend fun handleUnauthorized() {
        creationCapability = null
        sessionInvalidator.invalidate()
    }

    private fun isOnline(): Boolean = networkMonitor.connection.value == ConnectionState.Online
}

private data class CreationIdentity(
    val companyId: String,
    val username: String,
    val token: String,
)

private data class CreationCapability(
    val identity: CreationIdentity,
    val canCreate: Boolean,
)

private fun AppSession.identity() = CreationIdentity(companyId, username, token)
