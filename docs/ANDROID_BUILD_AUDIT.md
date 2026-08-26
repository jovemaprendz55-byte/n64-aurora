# Auditoria de Build Android — N64 Aurora

**Data da análise:** 26 de agosto de 2026  
**Escopo:** configuração Expo/Gradle, módulos NDK, fontes Mupen64Plus-AE e ponte JNI incorporada ao projeto.

## Conclusão executiva

Há **dois bloqueios técnicos confirmados** no repositório atual, independentes da fila de publicação. Eles são suficientes para tornar a compilação Android instável ou falhar assim que o Gradle chegar aos módulos nativos. A publicação parada em 1% não produz logs acessíveis neste ambiente, portanto não é possível provar que ela foi causada por um desses itens; porém ambos precisam ser corrigidos antes de uma nova tentativa de APK.

| Prioridade | Achado | Evidência | Efeito provável |
|---|---|---|---|
| Crítica | Seis módulos Android usam o mesmo namespace `org.mupen64plusae.v3.alpha`. | A auditoria encontrou a mesma declaração em core, áudio, entrada, RSP, GLN64 e `ae-bridge`. | Colisão durante a configuração/geração das classes `R` e `BuildConfig`. |
| Crítica para debug | A árvore vendorizada contém todas as sete dependências exigidas para `release/arm64-v8a`, mas nenhuma para `debug/arm64-v8a`. | `audit:native` confirmou `releaseDependencies.complete=true` e listou sete arquivos ausentes em debug. | `assembleDebug` pode falhar ao configurar CMake/ndk-build. |
| Alta | A compilação nativa não foi alcançada localmente. | Gradle parou com `SDK location not found` antes de configurar os módulos nativos. | Ainda não há confirmação de que C++, CMake e plugins produzem um APK. |
| Média | Vários módulos usam `c++_shared`, enquanto módulos upstream excluem `libc++_shared.so` inclusive em arm64. | Regras de `packagingOptions.jniLibs` nos Gradle do core, entrada, RSP, GLN64 e bridge. | Pode ocorrer erro de duplicação no empacotamento ou falha de carregamento em runtime. |
| Média | O plugin de configuração injeta `ext.ndkVersion` via substituição textual do Gradle. | `plugins/with-mupen64plus-ae.js`. | É frágil diante de mudanças na estrutura gerada pelo Expo. |

> O projeto passa em testes Vitest, TypeScript, lint, prebuild e autolinking. Esses resultados verificam JavaScript, configuração Expo e descoberta do módulo, **não** a compilação do core C/C++.

## Evidências verificadas

A configuração Expo resolvida declara **arm64-v8a**, `minSdkVersion 28`, `compileSdkVersion 36`, `targetSdkVersion 36` e NDK `26.1.10909125`. O `settings.gradle` inclui os seis módulos Mupen64Plus-AE e o `app/build.gradle` os declara como dependências. A seleção vendorizada ocupa aproximadamente 25 MB e inclui as bibliotecas de produção arm64 exigidas pelos makefiles: `libEGLLoader.a`, `libSDL2_net.so`, `libhidapi.so`, `libpng.a`, `librcheevos.a`, `libsoundtouch.so` e `libsoundtouch_fp.so`.

O problema de namespace é concreto: todos os seis `build.gradle` de biblioteca declaram `org.mupen64plusae.v3.alpha`. Cada módulo Android usa seu namespace para as classes geradas `R` e `BuildConfig`; a própria documentação do Android orienta modificar o namespace para evitar colisões.[1]

O problema de debug também é concreto. O makefile comum monta caminhos como `ndkLibs/libs/$(BUILD_VARIANT)/$(TARGET_ARCH_ABI)/…`; a árvore contém somente `release/arm64-v8a`. O build de depuração tende a resolver `debug/arm64-v8a`, onde não há nenhuma das bibliotecas necessárias.

## Situação por camada

| Camada | Resultado | Observação |
|---|---|---|
| Expo e JavaScript | Aprovado. | `pnpm check`, `pnpm lint`, testes e `expo config` concluíram. Há apenas aviso não bloqueante de `MODULE_TYPELESS_PACKAGE_JSON` do ESLint. |
| Prebuild e autolinking | Aprovado. | O projeto Android foi gerado e `N64CoreModule` foi descoberto pelo autolinking. |
| Gradle/Android SDK local | Bloqueado externamente. | O ambiente não tem `ANDROID_HOME`/`sdk.dir`; nenhuma tarefa de compilação Android completou. |
| Módulos Mupen64Plus-AE | Requer correção. | Namespaces duplicados e ausência de dependências debug são verificadas pela rotina `pnpm audit:native`. |
| JNI e runtime | Não comprovado. | A ponte C++ foi escrita e mapeia a API upstream, mas precisa compilar e ser executada em aparelho. |
| Publicação em 1% | Sem diagnóstico local. | Esse estágio pertence ao serviço de publicação; não há log remoto disponível neste ambiente. |

## Sequência de correção recomendada

Primeiro, atribua namespaces exclusivos aos seis módulos vendorizados, mantendo seus pacotes de código e nomes de biblioteca nativa intactos. Em seguida, decida explicitamente qual variante será distribuída. Para um APK de release, force o caminho release de todos os módulos e não invoque tarefas debug; para desenvolvimento, copie ou compile as sete dependências em `ndkLibs/libs/debug/arm64-v8a`.

Depois, centralize a regra de empacotamento de `libc++_shared.so` no módulo do aplicativo, adotando uma única cópia arm64 e removendo exclusões incompatíveis. Por fim, substitua a inserção textual de NDK no plugin por uma modificação Gradle idempotente baseada em marcador, ou deixe uma única fonte de verdade no `expo-build-properties` caso o build remoto respeite essa propriedade.

A próxima validação deve ser feita em máquina com Android SDK + NDK 26.1 instalados, executando `./gradlew :app:assembleRelease --stacktrace`. O primeiro erro Gradle deve ser corrigido antes de qualquer nova publicação. Após isso, o APK precisa ser instalado em Android 16 e testado com uma ROM pertencente ao usuário, verificando renderização, áudio, controles e encerramento de sessão.

## Rotina adicionada

O comando abaixo agora oferece uma verificação reproduzível antes do build:

```bash
pnpm audit:native
```

No estado atual, o comando termina com código 2 de propósito, pois detecta os namespaces duplicados e as dependências de debug ausentes. Ele deve terminar sem risco confirmado depois das correções.

## Referências

[1] [Android Developers — Configure the app module: Set the namespace](https://developer.android.com/build/configure-app-module#set-namespace)
