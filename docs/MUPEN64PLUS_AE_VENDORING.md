# Auditoria e vendor do Mupen64Plus-AE

## Fonte fixada

O núcleo será incorporado a partir do repositório oficial `mupen64plus-ae/mupen64plus-ae`, no commit `25cfb7a0cf27517f796fb2baf92606f3ae9417f3` da branch `master`. Fixar o commit evita que uma futura alteração upstream mude silenciosamente o comportamento ou os termos do artefato compilado.

O repositório é distribuído sob GPL-3.0. A distribuição do APK/AAB resultante deve preservar os avisos de licença, indicar as alterações realizadas e disponibilizar o código-fonte correspondente à mesma versão do binário.[1]

## Mapa da integração Android

| Bloco upstream | Papel | Necessidade inicial |
|---|---|---|
| `ae-bridge` | Biblioteca JNI `libae-bridge.so` que conecta o frontend Android a core e plugins. | Obrigatório. |
| `mupen64plus-core` | CPU, estado da máquina e API principal do emulador. | Obrigatório. |
| `mupen64plus-audio-android` | Plugin de áudio Android. | Obrigatório. |
| `mupen64plus-input-android` | Plugin de entrada Android, alvo dos controles táteis. | Obrigatório. |
| `mupen64plus-rsp-hle` | Plugin RSP de menor complexidade para a primeira execução. | Obrigatório. |
| `mupen64plus-video-gln64` | Renderizador OpenGL ES mais simples para o primeiro caminho de vídeo. | Obrigatório. |
| `build_common` e `ndkLibs` | Definições NDK e dependências usadas pela árvore upstream. | Obrigatório, com auditoria de binários pré-compilados. |

O `ae-bridge/Android.mk` upstream gera `ae-bridge` como biblioteca compartilhada e declara dependência das bibliotecas estáticas `EGLLoader` e `rcheevos`. Ele compila `ae_bridge.cpp` e `ae_ra_internal.c`, liga contra `log`, `EGL` e `android`, e usa `c++_shared` como STL.[2] O conjunto Gradle upstream agrega core, áudio, bridge, renderizadores, RSP e plugins de entrada como módulos independentes.[3]

## Limite desta etapa

Nenhuma biblioteca compilada de origem desconhecida será copiada para o APK. O vendor inicial traz somente fontes e arquivos de build necessários, mantendo os artefatos gerados fora do controle de versão. A compilação real exige Android NDK compatível e um Android SDK configurado; o projeto atual ainda não dispõe desses componentes no ambiente de validação local.

## Referências

[1] [Mupen64Plus-AE — repositório oficial e licença GPL-3.0](https://github.com/mupen64plus-ae/mupen64plus-ae)

[2] [ae-bridge/Android.mk — upstream](https://raw.githubusercontent.com/mupen64plus-ae/mupen64plus-ae/25cfb7a0cf27517f796fb2baf92606f3ae9417f3/ae-bridge/Android.mk)

[3] [settings.gradle — módulos upstream](https://raw.githubusercontent.com/mupen64plus-ae/mupen64plus-ae/25cfb7a0cf27517f796fb2baf92606f3ae9417f3/settings.gradle)
