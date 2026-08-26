# Contrato da ponte Android N64

## Objetivo desta etapa

O módulo local `modules/n64-core` introduz uma ponte Kotlin que será autolinkada no aplicativo Android. Ele expõe uma `SurfaceView` para o futuro renderizador do núcleo, controla o ciclo de vida da sessão e recebe os eventos de botões e do manípulo analógico. A estrutura segue o fluxo recomendado para módulos Expo locais, que são descobertos automaticamente no diretório `modules/` pelo mecanismo de autolinking.[1] [2]

> **Estado atual:** a ponte é compilável como módulo Android, mas não inclui os binários nem o código-fonte do Mupen64Plus-AE. Portanto, ela informa `coreLinked: false` até que a biblioteca `libae-bridge.so`, seus plugins e suas dependências sejam incorporados ao build sob GPL-3.0.

| Componente | Contrato | Comportamento sem o núcleo |
|---|---|---|
| `N64CoreModule` | Cria, pausa, retoma e encerra a sessão; encaminha entrada virtual; reporta estado. | Expõe disponibilidade e retorna uma mensagem explícita de que `ae-bridge` não foi incluída. |
| `N64CoreView` | Mantém uma `SurfaceView` e comunica criação/destruição da superfície. | Mostra a superfície preta pronta para receber EGL, sem renderização de ROM. |
| `N64SessionController` | Mantém uma sessão única, o URI da ROM e a associação da superfície. | Preserva o contrato e bloqueia o início da emulação para evitar uma sessão falsa. |
| `Mupen64Bridge` | Verifica e, na próxima etapa, carregará `libae-bridge.so` via JNI. | Não chama símbolos nativos se a biblioteca não estiver presente. |

## Contrato TypeScript

```ts
type N64SessionRequest = {
  romUri: string;
  gameId: string;
  profileId: string;
};

type N64SessionSnapshot = {
  sessionId: string;
  state: "idle" | "prepared" | "running" | "paused" | "stopped" | "error";
  coreLinked: boolean;
  message?: string;
};
```

As chamadas que fazem I/O, alteram a sessão ou precisam coordenar com a camada Android usam `AsyncFunction`; a API Expo recomenda esse formato para operações prolongadas ou que não devem bloquear a thread JavaScript.[3] Eventos nativos são emitidos como `onSessionState`, enquanto eventos de superfície ficam restritos ao componente de view.

## Próxima integração obrigatória

Para transformar a ponte em emulação executável, é necessário adicionar o código-fonte e os módulos compilados do Mupen64Plus-AE ao projeto Android. O repositório de referência agrupa core, áudio, entrada, RSP, renderizadores e a camada C/C++ `ae-bridge`.[4] Essa inclusão deve preservar a GPL-3.0, disponibilizar o código-fonte correspondente do APK/AAB e atualizar os avisos de licença.

## Referências

[1] [Expo Modules API — módulos locais](https://docs.expo.dev/modules/get-started/)

[2] [Expo Autolinking](https://docs.expo.dev/modules/autolinking/)

[3] [Expo Modules API — AsyncFunction e View](https://docs.expo.dev/modules/module-api/)

[4] [Mupen64Plus Android Edition](https://github.com/mupen64plus-ae/mupen64plus-ae)
