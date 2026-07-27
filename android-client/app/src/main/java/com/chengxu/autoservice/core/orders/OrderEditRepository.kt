package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderEditCommand
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf

data class OrderEditorData(
    val detail: OrderDetail,
    val metadata: OrderCreationMetadata,
    val capabilities: Set<BusinessCapability>,
    val serverTime: String,
)

interface OrderEditLocalStore : OrderDetailLocalStore {
    fun observeDraft(companyId: String, orderId: String): Flow<OrderDraft?>
    suspend fun save(companyId: String, orderId: String, draft: OrderDraft)
    suspend fun deleteDraft(companyId: String, orderId: String)
}

interface OrderEditRepository {
    suspend fun loadEditor(orderId: String): OrderCommandResult<OrderEditorData>
    fun observeDraft(orderId: String): Flow<OrderDraft?>
    suspend fun saveDraft(orderId: String, draft: OrderDraft)
    suspend fun deleteDraft(orderId: String)
    suspend fun edit(orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail>
    suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail>
}

class DefaultOrderEditRepository(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val readApi: OrderReadApi,
    private val createApi: OrderCreateApi,
    private val editApi: OrderEditApi,
    private val localStore: OrderEditLocalStore,
    private val summaryStore: OrderCreationSummaryStore,
    private val sessionInvalidator: SessionInvalidator,
) : OrderEditRepository {
    @Volatile private var context: EditorContext? = null

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun observeDraft(orderId: String): Flow<OrderDraft?> =
        sessionRepository.session.flatMapLatest { session ->
            session?.let { localStore.observeDraft(it.companyId, orderId) } ?: flowOf(null)
        }

    override suspend fun loadEditor(orderId: String): OrderCommandResult<OrderEditorData> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        val read = loadDetail(session, orderId)
        val envelope = (read as? OrderReadResult.Success)?.value ?: return read.toCommandResult()
        if (!isOnline()) {
            val cached = context?.takeIf { it.identity == session.editIdentity() && it.orderId == orderId }
                ?: return OrderCommandResult.NetworkUnavailable
            return OrderCommandResult.Success(OrderEditorData(envelope.order, cached.metadata, cached.capabilities, envelope.serverTime))
        }
        val metadata = createApi.fetchMetadata(session.token)
        when (metadata) {
            is OrderCommandResult.Success -> {
                val editor = OrderEditorData(envelope.order, metadata.value.metadata, envelope.capabilities, envelope.serverTime)
                context = EditorContext(session.editIdentity(), orderId, editor.metadata, editor.capabilities)
                return OrderCommandResult.Success(editor)
            }
            OrderCommandResult.Unauthorized -> handleUnauthorized()
            else -> Unit
        }
        return metadata.mapToEditorFailure()
    }

    override suspend fun saveDraft(orderId: String, draft: OrderDraft) {
        val session = sessionRepository.session.value ?: return
        require(draft.companyId == session.companyId && draft.localId == editDraftId(orderId))
        localStore.save(session.companyId, orderId, draft)
    }

    override suspend fun deleteDraft(orderId: String) {
        sessionRepository.session.value?.let { localStore.deleteDraft(it.companyId, orderId) }
    }

    override suspend fun edit(orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        val cached = context
        if (cached?.identity != session.editIdentity() || cached.orderId != orderId || BusinessCapability.EDIT_ORDER !in cached.capabilities) {
            return OrderCommandResult.Forbidden
        }
        return handleResult(session, orderId, editApi.edit(session.token, orderId, command))
    }

    override suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail> {
        val session = sessionRepository.session.value ?: return OrderCommandResult.Unauthorized
        if (!isOnline()) return OrderCommandResult.NetworkUnavailable
        return handleResult(session, null, editApi.queryOperation(session.token, operationId))
    }

    private suspend fun loadDetail(session: AppSession, orderId: String): OrderReadResult<com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope> {
        if (!isOnline()) return localStore.getDetail(session.companyId, orderId)?.let {
            OrderReadResult.Success(com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope(it, emptySet(), ""))
        } ?: OrderReadResult.Failure(OrderReadFailure.NetworkUnavailable)
        return when (val result = readApi.fetchDetail(session.token, orderId)) {
            is OrderReadResult.Success -> if (result.value.order.summary.companyId == session.companyId) {
                localStore.upsertDetail(result.value.order); result
            } else OrderReadResult.Failure(OrderReadFailure.MalformedResponse)
            is OrderReadResult.Failure -> {
                if (result.reason == OrderReadFailure.NotFound) localStore.deleteDetail(session.companyId, orderId)
                if (result.reason == OrderReadFailure.Unauthorized) handleUnauthorized()
                result
            }
        }
    }

    private suspend fun handleResult(session: AppSession, requestedOrderId: String?, result: OrderCommandResult<OrderDetail>): OrderCommandResult<OrderDetail> = when (result) {
        is OrderCommandResult.Success -> if (result.value.summary.companyId != session.companyId || (requestedOrderId != null && result.value.summary.id != requestedOrderId)) {
            OrderCommandResult.MalformedResponse
        } else {
            persist(result.value)
            result
        }
        OrderCommandResult.Unauthorized -> { handleUnauthorized(); result }
        OrderCommandResult.Forbidden -> { context = null; result }
        OrderCommandResult.NotFound -> { requestedOrderId?.let { localStore.deleteDetail(session.companyId, it) }; result }
        else -> result
    }

    private suspend fun persist(detail: OrderDetail) {
        try {
            localStore.upsertDetail(detail)
            summaryStore.upsert(detail.summary)
            localStore.deleteDraft(detail.summary.companyId, detail.summary.id)
        } catch (cancellation: CancellationException) { throw cancellation }
    }

    private suspend fun handleUnauthorized() { context = null; sessionInvalidator.invalidate() }
    private fun isOnline() = networkMonitor.connection.value == ConnectionState.Online
}

private data class EditorIdentity(val companyId: String, val username: String, val token: String)
private data class EditorContext(val identity: EditorIdentity, val orderId: String, val metadata: OrderCreationMetadata, val capabilities: Set<BusinessCapability>)
private fun AppSession.editIdentity() = EditorIdentity(companyId, username, token)
private fun editDraftId(orderId: String) = "edit:$orderId"

private fun OrderReadResult<*>.toCommandResult(): OrderCommandResult<Nothing> = when (this) {
    is OrderReadResult.Success -> error("success has no failure mapping")
    is OrderReadResult.Failure -> when (reason) {
        OrderReadFailure.Unauthorized -> OrderCommandResult.Unauthorized
        OrderReadFailure.Forbidden -> OrderCommandResult.Forbidden
        OrderReadFailure.NotFound -> OrderCommandResult.NotFound
        OrderReadFailure.NetworkUnavailable -> OrderCommandResult.NetworkUnavailable
        OrderReadFailure.ServerError -> OrderCommandResult.ServerFailure
        OrderReadFailure.MalformedResponse -> OrderCommandResult.MalformedResponse
    }
}

private fun OrderCommandResult<com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope>.mapToEditorFailure(): OrderCommandResult<OrderEditorData> = when (this) {
    is OrderCommandResult.Success -> error("success has no failure mapping")
    is OrderCommandResult.ValidationFailure -> this
    OrderCommandResult.Unauthorized -> OrderCommandResult.Unauthorized
    OrderCommandResult.Forbidden -> OrderCommandResult.Forbidden
    OrderCommandResult.NotFound -> OrderCommandResult.NotFound
    OrderCommandResult.OperationIdReused -> OrderCommandResult.OperationIdReused
    is OrderCommandResult.Conflict -> this
    is OrderCommandResult.UnknownResult -> this
    OrderCommandResult.NetworkUnavailable -> OrderCommandResult.NetworkUnavailable
    OrderCommandResult.ServerFailure -> OrderCommandResult.ServerFailure
    OrderCommandResult.MalformedResponse -> OrderCommandResult.MalformedResponse
}
