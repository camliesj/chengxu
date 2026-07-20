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
}
