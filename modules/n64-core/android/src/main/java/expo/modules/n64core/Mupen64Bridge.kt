package expo.modules.n64core

/**
 * Porta de entrada para as bibliotecas nativas do Mupen64Plus-AE.
 *
 * Esta classe não chama símbolos JNI enquanto libae-bridge.so não estiver
 * incluída no aplicativo. Dessa forma, a interface consegue informar a
 * disponibilidade real do núcleo sem simular uma sessão de emulação.
 */
object Mupen64Bridge {
  private val loadResult: Result<Unit> = runCatching {
    System.loadLibrary("ae-bridge")
  }

  val isLinked: Boolean
    get() = loadResult.isSuccess

  val unavailableMessage: String
    get() = loadResult.exceptionOrNull()?.let {
      "O núcleo Mupen64Plus-AE não está incluído nesta compilação Android."
    } ?: "O núcleo está disponível."
}
