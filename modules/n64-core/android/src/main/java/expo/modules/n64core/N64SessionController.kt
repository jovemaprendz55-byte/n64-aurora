package expo.modules.n64core

import android.content.Context
import android.net.Uri
import android.view.Surface
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

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
  private var romPath: String = ""
  private var configPath: String = ""
  private var dataPath: String = ""
  private var surface: Surface? = null
  private var state: N64SessionState = N64SessionState.IDLE
  private var message: String = "Pronto para iniciar uma sessão."

  @Synchronized
  fun prepare(context: Context, romUri: String, gameId: String, profileId: String): Map<String, Any> {
    this.sessionId = "n64-${System.currentTimeMillis()}"
    this.romUri = romUri
    this.gameId = gameId
    this.profileId = profileId
    this.configPath = File(context.filesDir, "n64/config").apply { mkdirs() }.absolutePath
    this.dataPath = File(context.filesDir, "n64/data").apply { mkdirs() }.absolutePath
    this.romPath = copyRomToPrivateStorage(context, romUri, gameId)
    this.state = if (Mupen64Bridge.isLinked && romPath.isNotEmpty()) N64SessionState.PREPARED else N64SessionState.ERROR
    this.message = if (Mupen64Bridge.isLinked) {
      if (romPath.isNotEmpty()) "ROM preparada. Aguardando superfície de vídeo." else "Não foi possível preparar a ROM no armazenamento privado."
    } else {
      Mupen64Bridge.unavailableMessage
    }
    return snapshot()
  }

  @Synchronized
  fun attachSurface(surface: Surface?, viewSessionId: String?) {
    this.surface = surface
    if (surface != null && Mupen64Bridge.isLinked && state == N64SessionState.PREPARED && Mupen64Bridge.attachSurface(surface)) {
      val error = Mupen64Bridge.start(romPath, configPath, dataPath)
      if (error == null) {
        state = N64SessionState.RUNNING
        message = "Sessão conectada à superfície de vídeo."
      } else {
        state = N64SessionState.ERROR
        message = error
      }
    }
    if (surface == null && state == N64SessionState.RUNNING) {
      state = N64SessionState.PAUSED
      message = "A superfície de vídeo foi liberada."
    }
  }

  @Synchronized
  fun pause(): Map<String, Any> {
    if (state == N64SessionState.RUNNING) {
      Mupen64Bridge.pause()
      state = N64SessionState.PAUSED
      message = "Sessão pausada."
    }
    return snapshot()
  }

  @Synchronized
  fun resume(): Map<String, Any> {
    if (Mupen64Bridge.isLinked && state == N64SessionState.PAUSED && surface != null) {
      Mupen64Bridge.resume()
      state = N64SessionState.RUNNING
      message = "Sessão retomada."
    }
    return snapshot()
  }

  @Synchronized
  fun stop(): Map<String, Any> {
    Mupen64Bridge.stop()
    state = N64SessionState.STOPPED
    message = "Sessão encerrada."
    romUri = ""
    gameId = ""
    profileId = ""
    romPath = ""
    configPath = ""
    dataPath = ""
    surface = null
    return snapshot()
  }

  @Synchronized
  fun sendButton(input: String, pressed: Boolean) {
    if (!Mupen64Bridge.isLinked || state != N64SessionState.RUNNING) return
    Mupen64Bridge.sendButton(input, pressed)
  }

  @Synchronized
  fun sendAnalog(x: Double, y: Double) {
    if (!Mupen64Bridge.isLinked || state != N64SessionState.RUNNING) return
    Mupen64Bridge.sendAnalog(x, y)
  }

  private fun copyRomToPrivateStorage(context: Context, source: String, gameId: String): String {
    return runCatching {
      val destination = File(context.filesDir, "n64/roms/${gameId.replace(Regex("[^A-Za-z0-9_-]"), "_")}.rom")
      destination.parentFile?.mkdirs()
      val uri = Uri.parse(source)
      val input = if (uri.scheme == "file") FileInputStream(File(requireNotNull(uri.path))) else context.contentResolver.openInputStream(uri)
      requireNotNull(input).use { stream -> FileOutputStream(destination).use { stream.copyTo(it) } }
      destination.absolutePath
    }.getOrElse { "" }
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
