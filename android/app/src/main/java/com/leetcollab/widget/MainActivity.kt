package com.leetcollab.widget

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidWidget")

        // Replace with production URL
        webView.loadUrl("https://leet-collab.vercel.app")

        scheduleWidgetUpdates()
    }

    private fun scheduleWidgetUpdates() {
        val updateRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(3, TimeUnit.HOURS)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "widget_update_work",
            ExistingPeriodicWorkPolicy.KEEP,
            updateRequest
        )
    }

    inner class WebAppInterface(private val activity: MainActivity) {
        @JavascriptInterface
        fun saveSession(token: String) {
            WidgetRepository.saveToken(activity, token)
            // Trigger immediate widget update when logged in
            WidgetUpdateWorker.updateWidgets(activity)
        }

        @JavascriptInterface
        fun clearSession() {
            WidgetRepository.clearToken(activity)
            WidgetUpdateWorker.updateWidgets(activity)
        }
    }
}\n