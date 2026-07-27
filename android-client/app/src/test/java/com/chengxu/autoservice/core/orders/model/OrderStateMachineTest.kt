package com.chengxu.autoservice.core.orders.model

import com.chengxu.autoservice.core.model.UserRole
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderStateMachineTest {
    @Test
    fun employeeMovesForwardOneStepOnly() {
        assertTrue(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.IN_REPAIR, OrderStatus.COMPLETED))
        assertTrue(
            allowedOrderTransition(
                UserRole.EMPLOYEE,
                OrderStatus.COMPLETED,
                OrderStatus.PENDING_SETTLEMENT,
            ),
        )
        assertFalse(
            allowedOrderTransition(
                UserRole.EMPLOYEE,
                OrderStatus.IN_REPAIR,
                OrderStatus.PENDING_SETTLEMENT,
            ),
        )
        assertFalse(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.COMPLETED, OrderStatus.IN_REPAIR))
        assertFalse(
            allowedOrderTransition(
                UserRole.EMPLOYEE,
                OrderStatus.PENDING_SETTLEMENT,
                OrderStatus.SETTLED,
            ),
        )
    }

    @Test
    fun administratorMovesOneStepInEitherDirectionInsideOrdinaryStates() {
        assertTrue(
            allowedOrderTransition(
                UserRole.ADMINISTRATOR,
                OrderStatus.COMPLETED,
                OrderStatus.IN_REPAIR,
            ),
        )
        assertTrue(
            allowedOrderTransition(
                UserRole.ADMINISTRATOR,
                OrderStatus.PENDING_SETTLEMENT,
                OrderStatus.COMPLETED,
            ),
        )
        assertFalse(
            allowedOrderTransition(
                UserRole.ADMINISTRATOR,
                OrderStatus.IN_REPAIR,
                OrderStatus.PENDING_SETTLEMENT,
            ),
        )
        assertFalse(
            allowedOrderTransition(
                UserRole.ADMINISTRATOR,
                OrderStatus.SETTLED,
                OrderStatus.PENDING_SETTLEMENT,
            ),
        )
    }

    @Test
    fun contractMatrixRejectsEveryRemainingOrdinaryStatusEdge() {
        val forbidden = listOf(
            Triple(UserRole.EMPLOYEE, OrderStatus.PENDING_SETTLEMENT, OrderStatus.COMPLETED),
            Triple(UserRole.EMPLOYEE, OrderStatus.PENDING_SETTLEMENT, OrderStatus.IN_REPAIR),
            Triple(UserRole.EMPLOYEE, OrderStatus.SETTLED, OrderStatus.PENDING_SETTLEMENT),
            Triple(UserRole.EMPLOYEE, OrderStatus.IN_REPAIR, OrderStatus.IN_REPAIR),
            Triple(UserRole.ADMINISTRATOR, OrderStatus.PENDING_SETTLEMENT, OrderStatus.IN_REPAIR),
            Triple(UserRole.ADMINISTRATOR, OrderStatus.PENDING_SETTLEMENT, OrderStatus.SETTLED),
            Triple(UserRole.ADMINISTRATOR, OrderStatus.SETTLED, OrderStatus.PENDING_SETTLEMENT),
            Triple(UserRole.ADMINISTRATOR, OrderStatus.COMPLETED, OrderStatus.COMPLETED),
        )

        forbidden.forEach { (role, from, to) ->
            assertFalse("$role must not move $from to $to", allowedOrderTransition(role, from, to))
        }
    }
}
