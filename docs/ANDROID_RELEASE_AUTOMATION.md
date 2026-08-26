# Automação de release Android

O projeto inclui `scripts/build_android_release.sh`, que executa a auditoria nativa, gera novamente a pasta Android e chama `:app:assembleRelease`. O script é destinado a uma máquina local configurada com Android SDK, Java e NDK `26.1.10909125`; ele não deve ser executado no ambiente de visualização web.
| Comando | Resultado |
| ------------------------------ | ------------------------------------------------------------------------ |
| `pnpm release:android:prepare` | Verifica dependências NDK e aplica o prebuild, sem compilar o APK. |
| `pnpm release:android` | Executa o prebuild e gera `android/app/build/outputs/apk/release/*.apk`. |
Antes da compilação completa, defina `ANDROID_SDK_ROOT` ou `ANDROID_HOME` apontando para o Android SDK. O script verifica se o NDK fixado pelo projeto existe em `ndk/26.1.10909125`, evita prompts interativos e encerra ao primeiro erro, deixando o `--stacktrace` do Gradle visível.

> O script apenas automatiza a compilação local. Para distribuição pelo fluxo hospedado do projeto, use a versão salva e o botão **Publish** na interface.

## GitHub Actions

O arquivo `.github/workflows/android-release.yml` permite gerar o mesmo APK na nuvem do GitHub. Ele pode ser iniciado manualmente na aba **Actions** ou automaticamente quando alterações de Android, NDK, scripts ou dependências forem enviadas para a branch `main`.
O job instala Java 17, Android API 36, CMake 3.22.1 e NDK 26.1.10909125, executa as verificações e envia o APK resultante como o artefato **n64-aurora-release-apk**. Após um job bem-sucedido, abra a execução no GitHub Actions e baixe o artefato na seção **Artifacts**. O workflow não publica em loja nem necessita de segredo enquanto utiliza a assinatura debug configurada pelo projeto; para distribuição pública, substitua a assinatura por um keystore mantido em GitHub Secrets.
