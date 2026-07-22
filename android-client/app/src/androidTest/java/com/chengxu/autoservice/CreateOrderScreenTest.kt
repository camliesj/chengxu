package com.chengxu.autoservice

import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.model.OrderCreationDefaults
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderCreationOptions
import com.chengxu.autoservice.ui.create.CreateOrderField
import com.chengxu.autoservice.ui.create.CreateOrderScreen
import com.chengxu.autoservice.ui.create.CreateOrderStep
import com.chengxu.autoservice.ui.create.CreateOrderTestTags
import com.chengxu.autoservice.ui.create.CreateOrderUiState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class CreateOrderScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun customerStepHasApprovedOrderErrorsAndReachableActions() {
        var nextCalls = 0
        launch(
            state().copy(
                fieldErrors = mapOf(CreateOrderField.CUSTOMER to "order.customer.required"),
            ),
            onNext = { nextCalls += 1 },
        )

        composeRule.onNodeWithText("客户与车辆").assertIsDisplayed()
        composeRule.onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}customer").assertIsDisplayed()
        composeRule.onNodeWithText("请输入客户姓名").assertIsDisplayed()
        composeRule.onNodeWithTag(CreateOrderTestTags.PRIMARY_ACTION)
            .assertHeightIsAtLeast(48.dp).performClick()
        assertEquals(1, nextCalls)
    }

    @Test
    fun offlineKeepsDraftFieldsEditableButDisablesFinalSubmit() {
        launch(
            state().copy(
                step = CreateOrderStep.CONFIRM,
                connection = ConnectionState.Offline,
            ),
        )

        composeRule.onNodeWithText("离线状态可继续编辑草稿，联网后才能提交").assertIsDisplayed()
        composeRule.onNodeWithTag(CreateOrderTestTags.PRIMARY_ACTION).assertIsNotEnabled()
        composeRule.onNodeWithTag(CreateOrderTestTags.BACK_ACTION).assertIsEnabled()
    }

    @Test
    fun leaveConfirmationExposesContinueDiscardAndSaveActions() {
        launch(state().copy(showLeaveConfirmation = true, dirty = true))

        composeRule.onNodeWithText("保留当前填写内容？").assertIsDisplayed()
        composeRule.onNodeWithText("继续编辑").assertIsDisplayed()
        composeRule.onNodeWithText("放弃草稿").assertIsDisplayed()
        composeRule.onNodeWithText("保存草稿并退出").assertIsDisplayed()
    }

    @Test
    fun deliverySuggestionsKeepTheCustomTextFieldAvailable() {
        launch(state().copy(step = CreateOrderStep.REPAIR))

        composeRule.onNodeWithText("待确认").assertIsDisplayed()
        composeRule.onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}delivery").assertIsDisplayed()
    }

    @Test
    fun fixedFooterOffersDraftSaveAndSubmittingLocksFields() {
        launch(state().copy(submitting = true))

        composeRule.onNodeWithTag(CreateOrderTestTags.SAVE_ACTION)
            .assertHeightIsAtLeast(48.dp).assertIsNotEnabled()
        composeRule.onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}customer").assertIsNotEnabled()
    }

    @Test
    fun anExistingUnknownOperationCanBeConfirmedAfterCreateCapabilityIsDisabled() {
        launch(
            state().copy(
                step = CreateOrderStep.CONFIRM,
                canCreate = false,
                unknownOperationId = "operation-pending",
            ),
        )

        composeRule.onNodeWithText("确认提交结果").assertIsDisplayed()
        composeRule.onNodeWithTag(CreateOrderTestTags.PRIMARY_ACTION).assertIsEnabled()
    }

    private fun launch(
        value: CreateOrderUiState,
        onNext: () -> Unit = {},
    ) {
        composeRule.setContent {
            AutoserviceTheme {
                CreateOrderScreen(
                    state = value,
                    onUpdate = { _, _ -> },
                    onNext = onNext,
                    onBack = {},
                    onSubmit = {},
                    onConfirmUnknown = {},
                    onSaveDraft = {},
                    onExit = {},
                    onContinueEditing = {},
                    onDiscardAndExit = {},
                    onSaveAndExit = {},
                )
            }
        }
    }

    private fun state() = CreateOrderUiState(
        loading = false,
        metadata = OrderCreationMetadata(
            contractVersion = 1,
            requiredFields = setOf("customer", "phone", "plate", "car", "insuranceExpiry", "record"),
            defaults = OrderCreationDefaults(),
            options = OrderCreationOptions(
                insurers = listOf("人保财险"), vehicleTypes = listOf("标的车"),
                accidentTypes = listOf("常规维修"), deliverySuggestions = listOf("待确认"),
            ),
            maxLengths = emptyMap(),
        ),
        canCreate = true,
        connection = ConnectionState.Online,
    )
}
