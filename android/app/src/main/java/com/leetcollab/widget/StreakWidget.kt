package com.leetcollab.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class StreakWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = context.getSharedPreferences("widget_state", Context.MODE_PRIVATE)
        val currentStreak = prefs.getInt("current_streak", 0)
        val completedToday = prefs.getBoolean("completed_today", false)
        val isLoggedIn = WidgetRepository.getToken(context) != null
        
        provideContent {
            GlanceTheme {
                WidgetContent(isLoggedIn, currentStreak, completedToday)
            }
        }
    }

    @Composable
    private fun WidgetContent(isLoggedIn: Boolean, streak: Int, completedToday: Boolean) {
        val context = LocalContext.current
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(Color(0xFF18181B)) // zinc-900 equivalent
                .padding(16.dp)
                .clickable(actionStartActivity(intent)),
            contentAlignment = Alignment.Center
        ) {
            if (!isLoggedIn) {
                Text(
                    text = "Tap to login",
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(Color(0xFFA1A1AA)), fontSize = 16.sp)
                )
            } else {
                Column(
                    modifier = GlanceModifier.fillMaxSize(),
                    horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    verticalAlignment = Alignment.Vertical.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
                        Text(
                            text = "🔥",
                            style = TextStyle(fontSize = 32.sp)
                        )
                        Text(
                            text = streak.toString(),
                            style = TextStyle(
                                color = androidx.glance.unit.ColorProvider(Color.White),
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                    Text(
                        text = "DAY STREAK",
                        style = TextStyle(
                            color = androidx.glance.unit.ColorProvider(Color(0xFFA1A1AA)),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    
                    Spacer(modifier = GlanceModifier.height(12.dp))
                    
                    val message = getRotationMessage(context, completedToday)
                    Text(
                        text = message,
                        style = TextStyle(
                            color = androidx.glance.unit.ColorProvider(Color.White),
                            fontSize = 14.sp
                        )
                    )
                }
            }
        }
    }

    private fun getRotationMessage(context: Context, completedToday: Boolean): String {
        // Change message every 3 hours deterministically
        val cycleIndex = (System.currentTimeMillis() / (3 * 60 * 60 * 1000)).toInt()
        
        val messages = if (completedToday) {
            listOf(
                "hooray!! you did it 🎉",
                "bro cooked today 🔥",
                "streak safe hai bhai 😌",
                "aaj ka grind complete 🫡",
                "W. see you tomorrow 😎",
                "one more day secured 🔥"
            )
        } else {
            listOf(
                "aaj ka question?? 👀",
                "bro pls aaja?? 😭",
                "bhai 10 min nikaal le",
                "streak todne ka plan hai kya 💀",
                "bro literally ek question hai 😭",
                "bhai raat ho rahi hai",
                "120 days waste mat kar pls 😭", // Will update dynamically maybe
                "question kar ke soja 😭"
            )
        }
        
        return messages[cycleIndex % messages.size]
    }
}\n