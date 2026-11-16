# Changelog

Todas as alterações notáveis deste módulo serão documentadas neste arquivo.

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
