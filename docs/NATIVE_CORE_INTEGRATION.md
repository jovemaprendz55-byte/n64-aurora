# Integração nativa do núcleo N64

## Decisão técnica

O N64 Aurora Emulator adota o **Mupen64Plus Android Edition (AE)** como referência de núcleo e integração Android. O projeto reúne o núcleo Mupen64Plus, plugins de vídeo, áudio, RSP e entrada, além de uma ponte C/C++ (`ae-bridge`) para o Android. O Mupen64Plus é um emulador de Nintendo 64 orientado a plugins e prevê uma interface de biblioteca compartilhada para frontends.[1] O repositório Android contém módulos para core, áudio, entrada, RSP e múltiplos renderizadores, inclusive GLideN64 e Parallel.[2]

| Camada | Responsabilidade no N64 Aurora | Implementação prevista |
|---|---|---|
| Interface | Biblioteca, importação, preferências e editor de controles. | Expo Router, React Native e TypeScript. |
| Ponte Android | Conectar a tela de jogo, ciclo de vida Android, documentos selecionados e eventos de toque ao núcleo. | Módulo nativo React Native em Kotlin/Java e `N64GameView`. |
| Ponte C/C++ | Converter chamadas da camada Android em comandos do Mupen64Plus e associar o `Surface` ao renderizador. | JNI + `ae-bridge`, seguindo a estrutura do projeto AE. |
| Núcleo e plugins | Emulação da CPU, renderização, áudio, RSP e entrada. | Módulos oficiais do Mupen64Plus-AE compilados pelo Android NDK. |

## Sequência de execução

O usuário seleciona uma ROM própria pelo seletor de documentos Android. O frontend persiste apenas metadados locais e a permissão do URI. Ao tocar em **Jogar**, ele envia ao módulo nativo o URI, o diretório de dados privados e o perfil de controle ativo. O módulo prepara o arquivo para leitura pelo núcleo, inicializa os plugins e monta a `N64GameView`; os toques de cada controle virtual são encaminhados como eventos de entrada. A saída gráfica é apresentada pela `Surface` nativa, enquanto as opções de interface continuam na camada React Native.

```text
React Native → N64CoreModule → Kotlin/Java → JNI / ae-bridge → Mupen64Plus + plugins → Surface Android
       ↑              ↓
 controles        estado da sessão / erros
```

## Build para Android 16

O build distribuível precisa usar uma compilação Android nativa, e não o cliente de visualização genérico, pois o cliente não contém o módulo JNI nem as bibliotecas `.so` do núcleo. A configuração do Android deve usar `compileSdk` e `targetSdk` 36 para Android 16.[3] O projeto AE publica instruções de compilação por Android Studio com SDK e NDK instalados; seu `app` declara ABIs `armeabi-v7a`, `arm64-v8a`, `x86` e `x86_64`.[4]

O perfil recomendado de distribuição inicial é **arm64-v8a**, com `armeabi-v7a` opcional para aparelhos antigos. Antes do primeiro build de produção, a camada nativa deve ser adicionada após a geração do diretório Android (`expo prebuild`) e validada em aparelho Android 16 real. O controle do ciclo de vida precisa manter a emulação fora da thread de interface e encerrar a sessão de forma explícita antes de liberar a biblioteca do núcleo.

## Licença e distribuição

O repositório Mupen64Plus-AE é licenciado sob **GPL-3.0**.[2] A distribuição de um aplicativo derivado que incorpore essa integração deve preservar avisos de copyright, disponibilizar o código-fonte correspondente, identificar modificações e disponibilizar o produto resultante sob os termos aplicáveis da GPLv3.[5] Por essa razão, a tela de licenças do aplicativo e o arquivo `OPEN_SOURCE_NOTICES.md` preservam a atribuição e indicam onde publicar o código-fonte do release.

O aplicativo não distribui ROMs, BIOS, capas, marcas de jogos ou conteúdo protegido. A importação se limita a arquivos que o usuário possui legitimamente. A compatibilidade de cada ROM pode variar por renderizador, dispositivo e configuração; ela deve ser tratada como estado de execução, e não prometida pela biblioteca.

## Contrato da ponte TypeScript

```ts
export type N64Input =
  | "a" | "b" | "z" | "l" | "r" | "start"
  | "dpadUp" | "dpadDown" | "dpadLeft" | "dpadRight"
  | "cUp" | "cDown" | "cLeft" | "cRight";

export interface N64CoreBridge {
  isAvailable(): Promise<boolean>;
  launchSession(request: {
    romUri: string;
    gameId: string;
    profileId: string;
  }): Promise<void>;
  sendButton(input: N64Input, pressed: boolean): void;
  sendAnalog(x: number, y: number): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
}
```

Essa interface é deliberadamente pequena para que o estado de biblioteca e de controles continue testável no JavaScript. O módulo nativo será a única camada que conhece bibliotecas compartilhadas, JNI, renderização e detalhes do NDK.

## Referências

[1] [Mupen64Plus — página oficial](https://mupen64plus.org/)

[2] [Mupen64Plus Android Edition — repositório e estrutura de módulos](https://github.com/mupen64plus-ae/mupen64plus-ae)

[3] [Android Developers — configurar o SDK do Android 16](https://developer.android.com/about/versions/16/setup-sdk)

[4] [Mupen64Plus-AE — README e instruções de compilação](https://raw.githubusercontent.com/mupen64plus-ae/mupen64plus-ae/master/README.md)

[5] [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
