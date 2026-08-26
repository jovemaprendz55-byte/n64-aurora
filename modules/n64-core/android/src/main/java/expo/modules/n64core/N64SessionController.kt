package expo.modules.n64core

import android.view.Surface

enum class N64SessionState(val value: String) {
  IDLE("idle"),
  PREPARED("prepared"),
  RUNNING("running"),
  PAUSED("paused"),
  STOPPED("stopped"),
  ERROR("error")
}

/** Mantém uma única sessão de ROM e separa o ciclo de vida da UI do núcleo JNI. */
object N64SessionController {
  private var sessionId: String = ""
  private var romUri: String = ""
  private var gameId: String = ""
  private var profileId: String = ""
  private var surface: Surface? = null
  private var state: N64SessionState = N64SessionState.IDLE
  private var message: String = "Pronto para iniciar uma sessão."

  @Synchronized
  fun prepare(romUri: String, gameId: String, profileId: String): Map<String, Any> {
    this.sessionId = "n64-${System.currentTimeMillis()}"
    this.romUri = romUri
    this.gameId = gameId
    this.profileId = profileId
    this.state = if (Mupen64Bridge.isLinked) N64SessionState.PREPARED else N64SessionState.ERROR
    this.message = if (Mupen64Bridge.isLinked) {
      "ROM preparada. Aguardando superfície de vídeo."
    } else {
      Mupen64Bridge.unavailableMessage
    }
    return snapshot()
  }

  @Synchronized
  fun attachSurface(surface: Surface?, viewSessionId: String?) {
    this.surface = surface
    if (surface != null && Mupen64Bridge.isLinked && state == N64SessionState.PREPARED) {
      state = N64SessionState.RUNNING
      message = "Sessão conectada à superfície de vídeo."
    }
    if (surface == null && state == N64SessionState.RUNNING) {
      state = N64SessionState.PAUSED
      message = "A superfície de vídeo foi liberada."
    }
  }

  @Synchronized
  fun pause(): Map<String, Any> {
    if (state == N64SessionState.RUNNING) {
      state = N64SessionState.PAUSED
      message = "Sessão pausada."
    }
    return snapshot()
  }

  @Synchronized
  fun resume(): Map<String, Any> {
    if (Mupen64Bridge.isLinked && state == N64SessionState.PAUSED && surface != null) {
      state = N64SessionState.RUNNING
      message = "Sessão retomada."
    }
    return snapshot()
  }

  @Synchronized
  fun stop(): Map<String, Any> {
    state = N64SessionState.STOPPED
    message = "Sessão encerrada."
    romUri = ""
    gameId = ""
    profileId = ""
    surface = null
    return snapshot()
  }

  @Synchronized
  fun sendButton(input: String, pressed: Boolean) {
    if (!Mupen64Bridge.isLinked || state != N64SessionState.RUNNING) return
    // Próxima etapa: encaminhar input ao plugin mupen64plus-input-android via JNI.
  }

  @Synchronized
  fun sendAnalog(x: Double, y: Double) {
    if (!Mupen64Bridge.isLinked || state != N64SessionState.RUNNING) return
    // Próxima etapa: encaminhar os eixos normalizados ao plugin de entrada via JNI.
  }

  @Synchronized
  fun snapshot(): Map<String, Any> = mapOf(
    "sessionId" to sessionId,
    "state" to state.value,
    "coreLinked" to Mupen64Bridge.isLinked,
    "message" to message,
    "hasSurface" to (surface != null),
    "gameId" to gameId,
    "profileId" to profileId
  )
}
