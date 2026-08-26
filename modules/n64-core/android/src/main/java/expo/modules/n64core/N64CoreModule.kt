package expo.modules.n64core

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** API Expo que conecta a sessão React Native à ponte Android do Mupen64Plus-AE. */
class N64CoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("N64Core")

    Constant("platform") { "android" }
    Constant("coreLinked") { Mupen64Bridge.isLinked }

    Events("onSessionState")

    Function("isAvailable") {
      Mupen64Bridge.isLinked
    }

    AsyncFunction("getSnapshotAsync") {
      N64SessionController.snapshot()
    }

    AsyncFunction("launchSession") { romUri: String, gameId: String, profileId: String ->
      val context = requireNotNull(appContext.reactContext)
      val snapshot = N64SessionController.prepare(context, romUri, gameId, profileId)
      sendEvent("onSessionState", snapshot)
      if (!Mupen64Bridge.isLinked) {
        throw IllegalStateException(Mupen64Bridge.unavailableMessage)
      }
      return@AsyncFunction snapshot
    }

    AsyncFunction("pause") {
      N64SessionController.pause().also { sendEvent("onSessionState", it) }
    }

    AsyncFunction("resume") {
      N64SessionController.resume().also { sendEvent("onSessionState", it) }
    }

    AsyncFunction("stop") {
      N64SessionController.stop().also { sendEvent("onSessionState", it) }
    }

    Function("sendButton") { input: String, pressed: Boolean ->
      N64SessionController.sendButton(input, pressed)
    }

    Function("sendAnalog") { x: Double, y: Double ->
      N64SessionController.sendAnalog(x, y)
    }

    OnActivityEntersBackground {
      sendEvent("onSessionState", N64SessionController.pause())
    }

    OnActivityEntersForeground {
      sendEvent("onSessionState", N64SessionController.resume())
    }

    OnActivityDestroys {
      sendEvent("onSessionState", N64SessionController.stop())
    }

    View(N64CoreView::class) {
      Prop("sessionId") { view: N64CoreView, sessionId: String? ->
        view.setSessionId(sessionId)
      }
      Events("onSurfaceReady", "onSurfaceDestroyed")
      OnViewDestroys { view: N64CoreView ->
        view.release()
      }
    }
  }
}
