# Auditoria de Build Android — N64 Aurora

**Data da análise:** 26 de agosto de 2026  
**Escopo:** configuração Expo/Gradle, módulos NDK, fontes Mupen64Plus-AE e ponte JNI incorporada ao projeto.

## Conclusão executiva

Os bloqueios estáticos de namespace, variante release e seleção de `libc++_shared.so` foram corrigidos. A primeira execução no GitHub Actions expôs dois problemas adicionais e reproduzíveis: conflito de declaração do pnpm e ausência de `std::format` no NDK 26.1 usado com React Native/Fabric. O workflow agora usa a versão de pnpm do projeto e NDK `27.2.12479018`, mantendo a Nova Arquitetura exigida pelo Reanimated 4.

| Prioridade | Achado | Evidência | Efeito provável |
|---|---|---|---|
| Corrigida | Seis módulos Android usavam o mesmo namespace `org.mupen64plusae.v3.alpha`. | Agora usam namespaces exclusivos sob `org.mupen64plusae.n64aurora.*`. | A colisão de classes geradas deixa de ser um risco confirmado. |
| Corrigida | A árvore vendorizada contém dependências somente em `release/arm64-v8a`. | `native_common.mk` agora fixa release mesmo em builds de desenvolvimento. | O NDK não resolve mais caminhos debug ausentes. |
| Alta | A compilação nativa não foi alcançada localmente. | Gradle parou com `SDK location not found` antes de configurar os módulos nativos. | Ainda não há confirmação de que C++, CMake e plugins produzem um APK. |
| Média | Vários módulos usam `c++_shared`, enquanto módulos upstream excluem `libc++_shared.so` inclusive em arm64. | Regras de `packagingOptions.jniLibs` nos Gradle do core, entrada, RSP, GLN64 e bridge. | Pode ocorrer erro de duplicação no empacotamento ou falha de carregamento em runtime. |
| Média | O plugin de configuração injeta `ext.ndkVersion` via substituição textual do Gradle. | `plugins/with-mupen64plus-ae.js`. | É frágil diante de mudanças na estrutura gerada pelo Expo. |

> O projeto passa em testes Vitest, TypeScript, lint, prebuild e autolinking. Esses resultados verificam JavaScript, configuração Expo e descoberta do módulo, **não** a compilação do core C/C++.

## Evidências verificadas

A configuração Expo resolvida declara **arm64-v8a**, `minSdkVersion 28`, `compileSdkVersion 36`, `targetSdkVersion 36` e NDK `27.2.12479018`. O `settings.gradle` inclui os seis módulos Mupen64Plus-AE e o `app/build.gradle` os declara como dependências. A seleção vendorizada ocupa aproximadamente 25 MB e inclui as bibliotecas de produção arm64 exigidas pelos makefiles: `libEGLLoader.a`, `libSDL2_net.so`, `libhidapi.so`, `libpng.a`, `librcheevos.a`, `libsoundtouch.so` e `libsoundtouch_fp.so`.

O problema de namespace foi confirmado na auditoria inicial e corrigido nesta revisão. Cada módulo Android usa seu namespace para as classes geradas `R` e `BuildConfig`; a documentação do Android orienta modificar o namespace para evitar colisões.[1]

O problema de debug também foi confirmado e corrigido. O makefile comum ainda monta caminhos como `ndkLibs/libs/$(BUILD_VARIANT)/$(TARGET_ARCH_ABI)/…`, mas a variante agora é fixada em release, o único conjunto vendorizado para `arm64-v8a`.

## Situação por camada

| Camada | Resultado | Observação |
|---|---|---|
| Expo e JavaScript | Aprovado. | `pnpm check`, `pnpm lint`, testes e `expo config` concluíram. Há apenas aviso não bloqueante de `MODULE_TYPELESS_PACKAGE_JSON` do ESLint. |
| Prebuild e autolinking | Aprovado. | O projeto Android foi gerado e `N64CoreModule` foi descoberto pelo autolinking. |
| Gradle/Android SDK local | Bloqueado externamente. | O ambiente não tem `ANDROID_HOME`/`sdk.dir`; nenhuma tarefa de compilação Android completou. |
| Módulos Mupen64Plus-AE | Aprovados na auditoria estática. | `pnpm audit:native` confirma namespaces únicos, bibliotecas release completas e release forçado. |
| JNI e runtime | Não comprovado. | A ponte C++ foi escrita e mapeia a API upstream, mas precisa compilar e ser executada em aparelho. |
| GitHub Actions | Em validação. | O job alcançou a compilação Gradle e registrou as falhas de pnpm, NDK 26.1/Fabric e arquitetura legada; o retry usa pnpm 9.12.0, Nova Arquitetura e NDK 27.2. |

## Sequência de correção recomendada

Os namespaces exclusivos, a variante release e a seleção única de `libc++_shared.so` já foram aplicados. A próxima validação deve observar se o build remoto compila todos os módulos com NDK 27.2 e a Nova Arquitetura habilitada.

A próxima validação deve ser feita em máquina com Android SDK + NDK 27.2 instalados, executando `./gradlew :app:assembleRelease --stacktrace`. Após um APK bem-sucedido, ele precisa ser instalado em Android 16 e testado com uma ROM pertencente ao usuário, verificando renderização, áudio, controles e encerramento de sessão.

## Rotina adicionada

O comando abaixo agora oferece uma verificação reproduzível antes do build:

```bash
pnpm audit:native
```

No estado atual, o comando termina com sucesso e marca o resultado como `review-required`: não há risco estático confirmado, mas a compilação Gradle nativa ainda precisa ser executada em ambiente Android com SDK configurado.

## Referências

[1] [Android Developers — Configure the app module: Set the namespace](https://developer.android.com/build/configure-app-module#set-namespace)
