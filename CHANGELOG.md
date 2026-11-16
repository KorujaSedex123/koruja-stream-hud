# Changelog

Todas as alterações notáveis deste módulo serão documentadas neste arquivo.

## [1.7.0] - 2026-11-16

### Adicionado
- **Banner Cinematográfico de Localização (`.koruja-location-banner`):** Título em caixa alta dourada, linha divisória animada e subtítulo itálico exibidos por 4.5s no centro do mapa, disparados automaticamente em `canvasReady` (setting `autoLocationBanner`), via `game.korujaStreamHud.showLocation({ title, subtitle })` ou pelo botão **🏰 Exibir Localização** no Editor Visual (`BroadcastChannel`).
- **Objetivo / Missão Atual na Tela (`.koruja-quest-box`):** Card discreto no canto superior esquerdo do mapa (`showQuestBox`, `customQuestText`) com fallback automático para a primeira quest ativa do **FeyHub**.
- **Corrupção da Malha Arcana (`.koruja-corruption-pill`) & Spell Orbs (`.koruja-spell-orbs`):** Indicador de corrupção nos cards dos jogadores (com alerta carmesim pulsante `.high-corruption` quando `>= 10`) e fallback para orbes de espaços de magia quando o módulo `malha-arcana` não estiver ativo.
- **Próximo Turno na Iniciativa (`.combat-next`):** Exibição discreta do próximo combatente visível (`A seguir: ...`) logo abaixo do turno atual na caixa de combate.

## [1.6.0] - 2026-11-16

### Adicionado
- **Preenchimento Inteligente das 6 Molduras de Câmera:** Cada jogador pode ser configurado individualmente como **Transparente (OBS)**, **Retrato do Personagem (Sem Webcam)** ou **Link Externo Embutido (`<iframe>` VDO.Ninja / App)**.
- **Gerador de Sala VDO.Ninja em 1 Clique:** Botão **VDO** por personagem que preenche automaticamente o link da live e copia o convite do jogador já com o **nome do personagem** embutido (`&label=Nome`), sem configurações extras!
- **Camada Persistente de Mídia (`#koruja-media-layer`):** Evita que as câmeras/iframes recarreguem quando o PV ou combate atualiza.

## [1.5.0] - 2026-11-16

### Adicionado
- **Modo Roleplay / Sem Mapa (`builtin-roleplay`):** Nova overlay focada em interpretação com grade 3x2 de câmeras grandes (`456x460`) para os 6 jogadores, câmera ampliada do Mestre (`440x306`) e feed de rolagens estendido (`620px`).
- **Botão Rápido "RP / Mapa":** Alterne entre o Modo Mapa e o Modo Roleplay ao vivo com 1 clique direto na aba de Atores, ou use o parâmetro `?mode=rp` em uma segunda cena do OBS.

## [1.4.0] - 2026-11-16

### Alterado
- **Suporte Completo para 6 Jogadores:** Grade inferior da moldura embutida e do Editor Visual Drag & Drop reajustada milimetricamente para 6 câmeras/cards (`228x154` cada, em `1920x1080`).

## [1.3.0] - 2026-11-16

### Adicionado
- **Barra de Vida de Chefe (Boss HP Bar):** Barra épica no topo do mapa estilo Dark Souls com rastro de dano atrasado, Resistências Lendárias e botão rápido de Coroa direto no Token HUD para o Mestre ativar/desativar.
- **Testes contra a Morte (Death Saves):** Ao cair a 0 PV, a barra do jogador exibe automaticamente os 3 Sucessos e 3 Falhas em tempo real.
- **Concentração & Inspiração Heroica:** Anel arcano pulsante para personagens concentrando em magia e emblema dourado de d20 para Inspiração Heroica.
- **Câmera Diretora Automática (Auto-Pan):** A câmera do cliente Stream desliza suavemente até o combatente ativo a cada mudança de turno.
- **Vitrine Cinematográfica de Imagens/NPCs:** Intercepta o comando "Mostrar aos Jogadores" (`ImagePopout`) no cliente Stream e exibe a arte em uma moldura gótica elegante sem janelas cinzas do Foundry.

## [1.2.0] - 2026-11-15

### Adicionado
- **Detecção de 20 Natural e 1 Natural** (`KorujaStreamHUD.detectNaturalD20`) com exibição automática de banner cinematográfico temporário (`.koruja-epic-banner.epic-crit` e `.epic-fumble`) sobre o recorte do mapa em rolagens públicas.
- Botões rápidos de teste no Editor Visual (**Testar 20 Natural** e **Testar 1 Natural**) disparando o alerta instantaneamente para a aba da Live via `BroadcastChannel("koruja-stream-hud")`.

### Alterado
- **Canvas `#board` visível no Modo Stream**: ocultação restrita à interface do Foundry (`#interface`, `#ui-left`, `#ui-right`, `#ui-top`, `#ui-bottom`, `#hotbar`, `#players`, `#navigation`, `#pause`, `#fps`, `#notifications`, `.application`), mantendo `#board` posicionado dentro do recorte do mapa.
- **Design mais limpo e menos poluído**: barra superior minimalista na moldura embutida (`builtin-sanguis`), recortes com bordas finas sem rótulos repetitivos, feed de rolagens limitado às últimas 5 rolagens públicas e cards/caixas translúcidos mais compactos.

## [1.0.0] - 2026-11-15

### Adicionado
- Lançamento inicial nativo para **Foundry VTT v14** e **D&D 5e v6+**.
- Modo **Stream HUD Transparente** automático por usuário (`Stream`) ou URL (`?streamhud=1`).
- Cards em tempo real com Retrato, Nome, Nível, Barra de PV (com animações de dano/cura), Escudo de CA, Condições ativas e Turno atual de combate.
- Popup de **Última Rolagem de Dados** com destaque para Crítico (20 Natural) e Falha Crítica (1 Natural), sem vazar sussurros do Mestre.
- Janela de configuração rápida com **ApplicationV2** e botão na aba de Atores.
- 4 layouts integrados (incluindo alinhamento com câmeras 1920x1080 do OBS).
- Pipeline automatizado de Releases via GitHub Actions.
