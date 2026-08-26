# Integração Mupen64Plus-AE no N64 Aurora

## Conteúdo incorporado

O projeto agora inclui uma seleção arm64-v8a do Mupen64Plus-AE no commit fixado `25cfb7a0cf27517f796fb2baf92606f3ae9417f3`. O plugin Expo `with-mupen64plus-ae` acrescenta core, bridge, áudio, entrada Android, RSP HLE e vídeo GLN64 ao Gradle gerado. O prebuild foi executado com sucesso e o `settings.gradle` resultante registra cada módulo.

| Camada | Implementação atual | Estado |
|---|---|---|
| Core e plugins | Fontes GPL-3.0 vendorizadas, restritas a `arm64-v8a`; dependências NDK de produção necessárias foram mantidas. | Integrado ao Gradle. |
| `ae-bridge` | Biblioteca upstream de vídeo EGL e ponte entre core/plugins. | Integrada ao Gradle. |
| Wrapper N64 Aurora | `n64-core-bridge` em C++ carrega core/plugins, chama `CoreStartup`, conecta a `Surface` e executa a ROM em thread própria. | Implementado, pendente de compilação Android. |
| Sessão Kotlin | Copia o URI da ROM para armazenamento privado, cria diretórios de dados/configuração e coordena a `SurfaceView`. | Implementado. |
| Controles virtuais | A interface continua exibindo e persistindo o layout. O wrapper JNI converte A/B/Z/L/R, Start, D-pad e C-buttons para os 14 índices oficiais do `mupen64plus-input-android` e envia o manípulo no intervalo normalizado de -1 a 1. | Implementado, pendente de teste em build Android. |

## Restrições de build

O build foi limitado a `arm64-v8a`, pois apenas as bibliotecas de produção dessa arquitetura foram incorporadas. O plugin também fixa o NDK `26.1.10909125`, versão declarada pela árvore upstream. A configuração Expo mantém Android 16 (`compileSdk`/`targetSdk` 36).

O prebuild, o autolinking, a tipagem, os testes e o lint concluíram sem erros. A compilação Gradle nativa ainda não foi executada neste ambiente porque o Android SDK não está instalado/configurado. Ela deve ser testada em um ambiente Android com SDK + NDK 26.1, antes de distribuir um APK.

## Licença e fonte correspondente

O arquivo `vendor/mupen64plus-ae/gpl-license` contém a GPL-3.0 upstream. A distribuição final precisa conservar os avisos de código aberto e disponibilizar o código-fonte correspondente ao commit fixado, incluindo ajustes locais descritos em `VENDOR.md`.[1]

## Próxima tarefa técnica

É necessário gerar e testar um build real em aparelho Android 16, validando inicialização do core, saída de áudio, renderização GLN64, resposta dos controles e encerramento completo da sessão.

## Referência

[1] [Mupen64Plus Android Edition — repositório oficial](https://github.com/mupen64plus-ae/mupen64plus-ae)
