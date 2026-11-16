# Koruja Stream HUD (Foundry VTT v14 + OBS)

Overlay leve, transparente e 100% nativa para exibir informações dos jogadores (**Retrato, Nome, Nível, PV em tempo real, CA, Condições, Turno Ativo e Última Rolagem de Dados**) no OBS Studio sem precisar de servidor externo ou Chroma Key.

## Como Configurar na VPS (4 Passos Simples)

1. **Instale e Ative o Módulo:** Copie a pasta `koruja-stream-hud` para o diretório `Data/modules/` da sua VPS e ative o módulo no seu Mundo.
2. **Crie o Usuário da Live:** No Foundry, crie um usuário chamado `Stream` (sem senha ou com senha simples) e dê a ele permissão **Observer** nas fichas dos jogadores.
3. **Escolha os Jogadores:** No topo da aba **Atores**, clique no botão **`Stream HUD`**, marque os 4 jogadores na ordem e salve.
4. **Adicione no OBS Studio:**
   - Adicione uma **Fonte de Navegador (Browser Source)** com resolução **1920x1080**.
   - Cole a URL: `https://korujagames.duckdns.org/?streamhud=1` (ou use `https://korujagames.duckdns.org/stream`).
   - Clique em **Interagir** no OBS apenas na primeira vez para entrar com o usuário `Stream` (e, se quiser desempenho máximo, marque *Desativar Canvas do Jogo* nas configurações desse usuário!).
   - O fundo ficará **100% transparente** com os 4 cards dos jogadores alinhados perfeitamente acima das molduras de câmera do seu `gameplay_overlay.html`!
