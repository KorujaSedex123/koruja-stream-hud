# 🎥 Koruja Stream HUD

[![Foundry Version](https://img.shields.io/badge/Foundry-v14%20(14.369)-orange?style=flat-square)](https://foundryvtt.com)
[![System](https://img.shields.io/badge/System-D%26D%205e%20v6+-red?style=flat-square)](https://github.com/foundryvtt/dnd5e)
[![Latest Release](https://img.shields.io/github/v/release/korujasedex123/koruja-stream-hud?style=flat-square)](https://github.com/korujasedex123/koruja-stream-hud/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/korujasedex123/koruja-stream-hud/latest/module.zip?color=blue&style=flat-square)](https://github.com/korujasedex123/koruja-stream-hud/releases)
[![License](https://img.shields.io/github/license/korujasedex123/koruja-stream-hud?style=flat-square)](LICENSE)

Overlay transparente, leve e **100% nativa para Foundry VTT v14** projetada para exibir informações dos jogadores ao vivo no **OBS Studio / Twitch**, sem precisar de servidores externos, aplicativos Electron ou Chroma Key.

---

## ✨ Recursos Principais

- **Fundo 100% Transparente:** Oculta toda a interface do Foundry automaticamente quando acessado pelo usuário `Stream` ou com `?streamhud=1` na URL.
- **Zero Servidor Externo:** Funciona perfeitamente em servidores **Foundry hospedados em VPS (HTTPS)** sem problemas de CORS ou Mixed Content.
- **Cards em Tempo Real:**
  - Retrato (com destaque visual de *Machucado* e *Caído*).
  - Barra de **PV (HP)** com animação de tremor vermelho ao sofrer dano e brilho verde ao curar (suporta PV Temporários).
  - Escudo de **Classe de Armadura (CA)** e **Nível**.
  - Ícones de **Condições / Efeitos Ativos**.
  - Destaque dourado automático no **Turno Ativo** durante o combate.
  - Popup da **Última Rolagem Pública** (com destaque especial para **20 Natural** e **Falha Crítica** — *nunca vaza sussurros secretos do Mestre*).
- **Configuração em 1 Clique (`ApplicationV2`):** Botão **Stream HUD** na aba de Atores para escolher os jogadores, ordem e layout.

---

## 📦 Instalação via Manifest URL (Foundry VTT)

No gerenciador de módulos do Foundry VTT, clique em **Instalar Módulo** e cole a URL abaixo em **Manifest URL**:

```text
https://github.com/korujasedex123/koruja-stream-hud/releases/latest/download/module.json
```

---

## 🚀 Como Usar no OBS Studio

1. **Crie um usuário no Foundry** chamado **`Stream`** (com permissão *Observer* nas fichas dos jogadores).
2. No Foundry (como Mestre), abra a aba **Atores**, clique em **`Stream HUD`** no topo, selecione os jogadores na ordem desejada e clique em **Salvar**.
3. No **OBS Studio**, adicione uma **Fonte de Navegador (Browser Source)** com resolução **`1920 x 1080`**.
4. Cole a URL do seu servidor com o parâmetro:
   ```text
   https://seu-foundry.com/?streamhud=1
   ```
5. Clique em **Interagir** no OBS apenas na primeira vez para entrar com o usuário `Stream`. *(Dica: ative **Disable Game Canvas** nas configurações do Foundry desse usuário para consumir quase 0% de GPU/CPU no OBS).*

---

## 🛠️ Como Publicar uma Nova Release (GitHub Actions)

Este repositório conta com automação oficial em `.github/workflows/release.yml`. Para gerar uma nova versão empacotada automaticamente:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O GitHub Actions irá atualizar o `module.json`, empacotar o `module.zip` limpo e publicar os artefatos na aba **Releases** automaticamente.
