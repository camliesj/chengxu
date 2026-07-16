package com.chengxu.autoservice.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class AppNavigationState(initialTab: RootTab = RootTab.WORKBENCH) {
    private val stacks = RootTab.entries.associateWith { tab ->
        mutableStateListOf<AppRoute>().apply { add(tab.root) }
    }

    var activeTab by mutableStateOf(initialTab)
        private set

    val currentStack: List<AppRoute>
        get() = stacks.getValue(activeTab)

    fun select(tab: RootTab) {
        if (tab == activeTab) {
            stacks.getValue(tab).apply {
                clear()
                add(tab.root)
            }
        } else {
            activeTab = tab
        }
    }

    fun push(route: AppRoute) {
        stacks.getValue(activeTab).add(route)
    }

    fun pop(): Boolean {
        val current = stacks.getValue(activeTab)
        return if (current.size > 1) {
            current.removeAt(current.lastIndex)
            true
        } else {
            false
        }
    }
}
