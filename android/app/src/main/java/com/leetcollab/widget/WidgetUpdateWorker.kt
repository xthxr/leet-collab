package com.leetcollab.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class WidgetUpdateWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val status = WidgetRepository.fetchStatus(context)
            if (status != null) {
                // Save to simple shared prefs for synchronous UI render in Glance
                val prefs = context.getSharedPreferences("widget_state", Context.MODE_PRIVATE)
                prefs.edit()
                    .putInt("current_streak", status.currentStreak)
                    .putBoolean("completed_today", status.completedToday)
                    .apply()
                
                StreakWidget().updateAll(context)
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        fun updateWidgets(context: Context) {
            // Can be called directly to fetch and update
            Thread {
                val status = WidgetRepository.fetchStatus(context)
                if (status != null) {
                    val prefs = context.getSharedPreferences("widget_state", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putInt("current_streak", status.currentStreak)
                        .putBoolean("completed_today", status.completedToday)
                        .apply()
                }
                // Try to update Glance even if fetch failed (to update rotation msg)
                // Need a coroutine context for updateAll, but we can just use a simple runBlocking or similar if needed.
                // In production, we should launch a coroutine. For simplicity in this demo:
                val intent = android.content.Intent(context, StreakWidgetReceiver::class.java).apply {
                    action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
                }
                context.sendBroadcast(intent)
            }.start()
        }
    }
}\n