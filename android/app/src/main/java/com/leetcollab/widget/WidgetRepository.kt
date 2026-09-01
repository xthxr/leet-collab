package com.leetcollab.widget

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.IOException

data class WidgetStatus(val currentStreak: Int, val completedToday: Boolean)

object WidgetRepository {
    private const val PREFS_FILE = "widget_prefs"
    private const val TOKEN_KEY = "supabase_access_token"
    
    // Replace with production URL
    private const val API_URL = "https://leet-collab.vercel.app/api/widget/status"
    
    private val client = OkHttpClient()

    private fun getPrefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        PREFS_FILE,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveToken(context: Context, token: String) {
        getPrefs(context).edit().putString(TOKEN_KEY, token).apply()
    }

    fun clearToken(context: Context) {
        getPrefs(context).edit().remove(TOKEN_KEY).apply()
    }

    fun getToken(context: Context): String? {
        return getPrefs(context).getString(TOKEN_KEY, null)
    }

    fun fetchStatus(context: Context): WidgetStatus? {
        val token = getToken(context) ?: return null

        val request = Request.Builder()
            .url(API_URL)
            .addHeader("Authorization", "Bearer $token")
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)
                
                val streak = json.optInt("current_streak", 0)
                val completed = json.optBoolean("completed_today", false)
                
                return WidgetStatus(streak, completed)
            }
        } catch (e: IOException) {
            e.printStackTrace()
            return null
        }
    }
}\n