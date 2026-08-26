# Mupen64Plus-AE vendorizado

Esta árvore contém uma seleção rastreável do repositório oficial `mupen64plus-ae/mupen64plus-ae`, fixada no commit `25cfb7a0cf27517f796fb2baf92606f3ae9417f3`.

Foram incluídos `ae-bridge`, `mupen64plus-core`, áudio, entrada Android, RSP HLE, vídeo GLN64 e as dependências NDK necessárias ao caminho arm64-v8a. As bibliotecas de produção `libEGLLoader.a`, `libpng.a`, `librcheevos.a`, `libSDL2_net.so`, `libhidapi.so`, `libsoundtouch.so` e `libsoundtouch_fp.so` foram mantidas porque são referenciadas diretamente pelos makefiles/CMake upstream; suas fontes e licenças correspondentes permanecem na mesma árvore upstream. Variantes de depuração e ABIs x86 não foram copiadas. O projeto Android é deliberadamente limitado a `arm64-v8a`, arquitetura esperada em aparelhos Android 16 atuais.

Os ajustes locais são: limitar o ABI a `arm64-v8a`; forçar a variante release no `native_common.mk`, pois somente as dependências release foram vendorizadas; criar manifests mínimos exigidos pelos módulos Gradle; atribuir namespaces exclusivos a cada biblioteca; centralizar a seleção de `libc++_shared.so` no aplicativo; e declarar os módulos no plugin Expo `plugins/with-mupen64plus-ae.js`. Todas as demais fontes preservam sua origem upstream. O texto integral da GPL-3.0 encontra-se em `gpl-license`.
