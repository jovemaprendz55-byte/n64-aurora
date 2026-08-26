# Design de Interface — N64 Aurora Emulator

## Direção do produto

O **N64 Aurora Emulator** será um aplicativo em português para Android 16 que organiza ROMs pertencentes ao usuário e oferece uma experiência de emulação focada em agilidade, legibilidade e controles táteis configuráveis. A interface deve parecer nativa em telas verticais 9:16, com ações principais ao alcance do polegar e navegação inferior persistente. A execução da emulação é responsabilidade de um núcleo open source integrado em camada nativa; a interface React Native controla biblioteca, preferências e configuração de entrada.

## Tela e conteúdo

| Tela | Conteúdo principal | Ações disponíveis |
|---|---|---|
| **Biblioteca** | Cabeçalho de boas-vindas, busca, resumo da coleção, cartões de jogos recentes e estado vazio esclarecedor. | Importar ROM própria, pesquisar, abrir jogo, marcar favorito. |
| **Importar jogos** | Orientação jurídica concisa, seletor de arquivo Android e lista de importações válidas. | Escolher arquivo, confirmar inclusão ou cancelar. |
| **Detalhe do jogo** | Capa, título, última sessão, metadados locais e ação primária destacada. | Iniciar, favoritar, remover da biblioteca, abrir configurações do jogo. |
| **Emulação** | Área de vídeo do núcleo nativo em paisagem dentro de uma tela adaptável, barra superior discreta e controles virtuais sobrepostos. | Pausar, abrir menu rápido, salvar/carregar estado, ativar modo de edição dos controles. |
| **Editar controles** | Prévia em tela cheia dos botões, manípulo analógico, gatilhos e C-buttons, com grade leve e painel de propriedades. | Arrastar, redimensionar, alterar opacidade, restaurar padrão e salvar perfil. |
| **Configurações** | Preferências de aparência, desempenho, áudio, vibração e perfis de controle. | Alterar opções, selecionar perfil ativo e acessar informações de licença. |
| **Sobre e licenças** | Aviso de ROMs próprias, versão do aplicativo, atribuição e licença do núcleo integrado. | Consultar documentos e copiar informações técnicas. |

## Fluxos principais

O fluxo de primeira utilização começa na **Biblioteca**. Caso não haja títulos, o usuário toca em **Importar minha ROM**, lê o aviso de uso de cópias obtidas legalmente e escolhe um arquivo local. Após o núcleo reconhecer o formato aceito, o título é listado na Biblioteca e pode ser aberto no detalhe do jogo. Em seguida, o usuário toca em **Jogar**; a camada nativa recebe o URI do arquivo, prepara a sessão e a tela de emulação apresenta a área de vídeo e o perfil de controle ativo.

Durante o jogo, o usuário pode tocar no menu discreto, pausar a sessão e entrar em **Editar controles**. Nesta tela, cada elemento possui alça de arraste e seleção por toque; o usuário posiciona os elementos de acordo com sua preferência, ajusta opacidade e tamanho e salva a alteração no perfil ativo. Ao retornar, o mesmo perfil é aplicado imediatamente e persiste no dispositivo.

## Composição e ergonomia

Na Biblioteca, o cabeçalho ocupa aproximadamente um quarto da área acima da dobra e inclui a saudação, um botão circular de configurações e a principal chamada para importar jogos. Cartões de jogo usam proporção vertical, cantos de 18 px e espaçamento de 12 px para facilitar o toque. A barra inferior contém Biblioteca, Controles e Ajustes, com rótulos explícitos e área de toque mínima de 44 px.

Na tela de emulação, a área de vídeo fica centralizada, com os comandos essenciais nas laterais inferiores: manípulo e D-pad à esquerda, botões A/B/C e gatilhos à direita. O menu rápido fica no canto superior direito para evitar acionamento acidental. O editor preserva a orientação retrato para facilitar ajustes com uma mão, usando uma prévia escalada do layout de jogo e uma folha inferior para as propriedades do controle selecionado.

## Cores e tipografia

| Papel visual | Cor | Uso |
|---|---:|---|
| Fundo noturno | `#090B12` | Fundo principal e tela de emulação. |
| Superfície grafite | `#141827` | Cartões, folhas e painéis elevados. |
| Acento aurora | `#8B5CF6` | Ações primárias, controles selecionados e foco. |
| Acento ciano | `#22D3EE` | Indicadores de atividade e detalhes de progresso. |
| Texto principal | `#F7F8FC` | Títulos, números e ações de alto contraste. |
| Texto secundário | `#A8B0C4` | Rótulos, descrições e metadados. |
| Borda | `#2A3146` | Separadores discretos e campos. |

O visual combina grafite profundo, violeta aurora e ciano sem reproduzir marcas, personagens ou artes protegidas. A tipografia usa a fonte de sistema, com títulos em peso 700, texto de interface em 600 e conteúdo auxiliar em 400. A hierarquia deve priorizar contraste, espaçamento generoso e retorno tátil discreto em ações importantes.

## Critérios de qualidade

O aplicativo deve manter todos os controles de biblioteca e preferências acessíveis em retrato, fornecer estados vazios e de erro compreensíveis, respeitar área segura e não conter ROMs, BIOS, imagens de jogos ou marcas de franquias na distribuição. O componente de emulação deverá deixar explícito quando o binário nativo ainda não estiver disponível na compilação de visualização e encaminhar o usuário a um build Android com a camada nativa instalada.
