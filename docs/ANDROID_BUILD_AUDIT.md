# Auditoria de Build Android — N64 Aurora

**Data da análise:** 26 de agosto de 2026  
**Escopo:** configuração Expo/Gradle, módulos NDK, fontes Mupen64Plus-AE e ponte JNI incorporada ao projeto.

## Conclusão executiva

Os **dois bloqueios técnicos confirmados** foram corrigidos nesta revisão: cada módulo recebeu namespace único e a variante release foi fixada para as dependências nativas vendorizadas. Também foram criados os manifests mínimos dos módulos e centralizada a seleção de `libc++_shared.so`. A publicação parada em 1% não produz logs acessíveis neste ambiente, portanto ainda não é possível atribuir esse estado a uma causa remota específica.

| Prioridade | Achado | Evidência | Efeito provável |
|---|---|---|---|
| Corrigida | Seis módulos Android usavam o mesmo namespace `org.mupen64plusae.v3.alpha`. | Agora usam namespaces exclusivos sob `org.mupen64plusae.n64aurora.*`. | A colisão de classes geradas deixa de ser um risco confirmado. |
| Corrigida | A árvore vendorizada contém dependências somente em `release/arm64-v8a`. | `native_common.mk` agora fixa release mesmo em builds de desenvolvimento. | O NDK não resolve mais caminhos debug ausentes. |
| Alta | A compilação nativa não foi alcançada localmente. | Gradle parou com `SDK location not found` antes de configurar os módulos nativos. | Ainda não há confirmação de que C++, CMake e plugins produzem um APK. |
| Média | Vários módulos usam `c++_shared`, enquanto módulos upstream excluem `libc++_shared.so` inclusive em arm64. | Regras de `packagingOptions.jniLibs` nos Gradle do core, entrada, RSP, GLN64 e bridge. | Pode ocorrer erro de duplicação no empacotamento ou falha de carregamento em runtime. |
| Média | O plugin de configuração injeta `ext.ndkVersion` via substituição textual do Gradle. | `plugins/with-mupen64plus-ae.js`. | É frágil diante de mudanças na estrutura gerada pelo Expo. |

> O projeto passa em testes Vitest, TypeScript, lint, prebuild e autolinking. Esses resultados verificam JavaScript, configuração Expo e descoberta do módulo, **não** a compilação do core C/C++.

## Evidências verificadas

A configuração Expo resolvida declara **arm64-v8a**, `minSdkVersion 28`, `compileSdkVersion 36`, `targetSdkVersion 36` e NDK `26.1.10909125`. O `settings.gradle` inclui os seis módulos Mupen64Plus-AE e o `app/build.gradle` os declara como dependências. A seleção vendorizada ocupa aproximadamente 25 MB e inclui as bibliotecas de produção arm64 exigidas pelos makefiles: `libEGLLoader.a`, `libSDL2_net.so`, `libhidapi.so`, `libpng.a`, `librcheevos.a`, `libsoundtouch.so` e `libsoundtouch_fp.so`.

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
| Publicação em 1% | Sem diagnóstico local. | Esse estágio pertence ao serviço de publicação; não há log remoto disponível neste ambiente. |

## Sequência de correção recomendada

Os namespaces exclusivos, a variante release e a seleção única de `libc++_shared.so` já foram aplicados. A próxima validação deve observar se o build remoto utiliza o NDK 26.1 configurado pelo plugin Expo.

A próxima validação deve ser feita em máquina com Android SDK + NDK 26.1 instalados, executando `./gradlew :app:assembleRelease --stacktrace`. O primeiro erro Gradle deve ser corrigido antes de qualquer nova publicação. Após isso, o APK precisa ser instalado em Android 16 e testado com uma ROM pertencente ao usuário, verificando renderização, áudio, controles e encerramento de sessão.

## Rotina adicionada

O comando abaixo agora oferece uma verificação reproduzível antes do build:

```bash
pnpm audit:native
```

No estado atual, o comando termina com sucesso e marca o resultado como `review-required`: não há risco estático confirmado, mas a compilação Gradle nativa ainda precisa ser executada em ambiente Android com SDK configurado.

## Referências

[1] [Android Developers — Configure the app module: Set the namespace](https://developer.android.com/build/configure-app-module#set-namespace)
