package expo.modules.n64core

import android.view.Surface

/**
 * Porta de entrada para as bibliotecas nativas do Mupen64Plus-AE.
 */
object Mupen64Bridge {
  private val loadResult: Result<Unit> = runCatching {
    System.loadLibrary("ae-bridge")
    System.loadLibrary("n64-core-bridge")
  }

  val isLinked: Boolean
    get() = loadResult.isSuccess

  val unavailableMessage: String
    get() = loadResult.exceptionOrNull()?.let {
      "O núcleo Mupen64Plus-AE não pôde ser carregado: ${it.message ?: "biblioteca ausente"}."
    } ?: "O núcleo está disponível."

  fun attachSurface(surface: Surface?): Boolean = isLinked && nativeAttachSurface(surface)
  fun start(romPath: String, configPath: String, dataPath: String): String? =
    if (isLinked) nativeStart(romPath, configPath, dataPath) else unavailableMessage
  fun pause() { if (isLinked) nativePause() }
  fun resume() { if (isLinked) nativeResume() }
  fun sendButton(input: String, pressed: Boolean) { if (isLinked) nativeSetButton(input, pressed) }
  fun sendAnalog(x: Double, y: Double) { if (isLinked) nativeSetAnalog(x, y) }
  fun stop() { if (isLinked) nativeStop() }

  private external fun nativeAttachSurface(surface: Surface?): Boolean
  private external fun nativeStart(romPath: String, configPath: String, dataPath: String): String?
  private external fun nativePause()
  private external fun nativeResume()
  private external fun nativeSetButton(input: String, pressed: Boolean)
  private external fun nativeSetAnalog(x: Double, y: Double)
  private external fun nativeStop()
}
