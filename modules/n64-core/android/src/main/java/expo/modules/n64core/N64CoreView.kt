package expo.modules.n64core

import android.content.Context
import android.graphics.Color
import android.view.SurfaceHolder
import android.view.SurfaceView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** Superfície EGL reservada para a saída gráfica do núcleo Mupen64Plus-AE. */
class N64CoreView(context: Context, appContext: AppContext) : ExpoView(context, appContext), SurfaceHolder.Callback {
  private val onSurfaceReady by EventDispatcher()
  private val onSurfaceDestroyed by EventDispatcher()
  private var sessionId: String? = null

  private val gameSurface = SurfaceView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    setBackgroundColor(Color.BLACK)
    holder.addCallback(this@N64CoreView)
  }

  init {
    setBackgroundColor(Color.BLACK)
    addView(gameSurface)
  }

  fun setSessionId(value: String?) {
    sessionId = value
  }

  override fun surfaceCreated(holder: SurfaceHolder) {
    N64SessionController.attachSurface(holder.surface, sessionId)
    onSurfaceReady(
      mapOf(
        "sessionId" to (sessionId ?: ""),
        "width" to width,
        "height" to height
      )
    )
  }

  override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
    if (holder.surface.isValid) {
      N64SessionController.attachSurface(holder.surface, sessionId)
    }
  }

  override fun surfaceDestroyed(holder: SurfaceHolder) {
    N64SessionController.attachSurface(null, sessionId)
    onSurfaceDestroyed(mapOf("sessionId" to (sessionId ?: "")))
  }

  fun release() {
    gameSurface.holder.removeCallback(this)
    N64SessionController.attachSurface(null, sessionId)
  }
}
