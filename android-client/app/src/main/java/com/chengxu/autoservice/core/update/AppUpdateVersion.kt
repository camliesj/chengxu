package com.chengxu.autoservice.core.update

object AppUpdateVersion {
    private val versionPattern = Regex("^\\d+\\.\\d+\\.\\d+$")

    fun isValid(value: String): Boolean = versionPattern.matches(value.trim())

    fun isStrictlyNewer(remote: String, current: String): Boolean {
        val remoteParts = parse(remote) ?: return false
        val currentParts = parse(current) ?: return false
        for (index in remoteParts.indices) {
            when {
                remoteParts[index] > currentParts[index] -> return true
                remoteParts[index] < currentParts[index] -> return false
            }
        }
        return false
    }

    private fun parse(value: String): List<Int>? {
        val normalized = value.trim()
        if (!isValid(normalized)) return null
        return normalized.split('.').map { it.toIntOrNull() ?: return null }
    }
}
