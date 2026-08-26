# Build Android com a ponte N64Core

## O que mudou

O projeto agora contém o módulo local `modules/n64-core`, descoberto pelo Expo Autolinking e aplicado ao projeto Android gerado pelo prebuild. O módulo registra `expo.modules.n64core.N64CoreModule`, uma `SurfaceView` de vídeo e chamadas para iniciar, pausar, retomar, encerrar e receber entrada virtual.

Como código Kotlin não é recarregado por Fast Refresh, uma nova compilação Android é obrigatória após esta alteração.[1] A sessão anterior instalada no aparelho continua usando o binário anterior até que uma nova versão seja construída e instalada.

| Etapa | Resultado esperado | Estado atual |
|---|---|---|
| Autolinking Expo | O Gradle encontra `modules/n64-core/android`. | Validado pelo relatório Android de autolinking. |
| Prebuild Android | Diretório `android/` é gerado com a configuração Expo. | Concluído. |
| Bridge Kotlin | `N64CoreModule` e `N64CoreView` são incluídos no próximo build. | Preparado, aguardando recompilação. |
| Mupen64Plus-AE | `ae-bridge`, core e plugins são vinculados ao APK/AAB. | Pendente, não incluso deliberadamente. |

## Limite de validação local

O Gradle conseguiu configurar o projeto e reconheceu `compileSdk`/`targetSdk` 36 durante a verificação, mas a compilação Kotlin não pôde ser iniciada neste ambiente porque não há Android SDK configurado (`ANDROID_HOME`/`android/local.properties`). Isso não representa uma falha de código da ponte; a recompilação deve ocorrer no ambiente Android que já foi utilizado para instalar o aplicativo, ou no fluxo de build Android do projeto.

## Recompilação

Em um ambiente com Android SDK, abra o diretório `android/` no Android Studio e gere um novo APK/AAB, ou construa uma nova versão pelo fluxo de publicação do projeto. O Android 16 requer `compileSdk` e `targetSdk` 36, configuração já declarada em `app.config.ts`.[2]

> A visualização web e o cliente que não foi recompilado continuarão exibindo o modo seguro de prévia. Isso evita alegar que uma ROM está em execução quando `libae-bridge.so` ainda não está dentro do binário.

## Inclusão do núcleo na próxima etapa

O núcleo deve ser incluído a partir do repositório oficial Mupen64Plus-AE, que contém o core, os plugins de vídeo, áudio, entrada, RSP e a camada `ae-bridge`.[3] O Gradle do módulo local deverá então declarar os diretórios de bibliotecas JNI e a ponte Kotlin deverá substituir os pontos marcados por chamadas JNI reais.

A distribuição que incorpore essa base deve respeitar a GPL-3.0: preservar avisos, indicar modificações e disponibilizar o código-fonte correspondente ao binário distribuído.[4] O projeto já mantém os documentos `OPEN_SOURCE_NOTICES.md`, `NATIVE_CORE_INTEGRATION.md` e `NATIVE_BRIDGE_CONTRACT.md` para esse fim.

## Referências

[1] [Expo Modules API — módulos locais e rebuild nativo](https://docs.expo.dev/modules/get-started/)

[2] [Android Developers — configurar o SDK do Android 16](https://developer.android.com/about/versions/16/setup-sdk)

[3] [Mupen64Plus Android Edition — repositório oficial](https://github.com/mupen64plus-ae/mupen64plus-ae)

[4] [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
