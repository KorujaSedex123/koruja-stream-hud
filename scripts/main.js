const MODULE_ID = "koruja-stream-hud";

const DEFAULT_POSITIONS = {
  p1: { x: 20, y: 976 },
  p2: { x: 380, y: 976 },
  p3: { x: 740, y: 976 },
  p4: { x: 1100, y: 976 },
  chat: { x: 1460, y: 334 },
  combat: { x: 1460, y: 874 }
};

/**
 * Verifica se o cliente atual deve exibir o modo Stream HUD transparente.
 */
function isStreamMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("streamhud") === "1") return true;
  if (game.view === "stream") return true;

  const streamUsername = (game.settings.get(MODULE_ID, "streamUser") || "Stream").trim().toLowerCase();
  if (game.user?.name?.trim().toLowerCase() === streamUsername) return true;

  return false;
}

/**
 * Janela visual com Drag & Drop para o Mestre configurar jogadores, imagem de overlay e posições.
 */
class StreamPartyConfigApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "koruja-stream-hud-config",
    tag: "form",
    window: {
      title: "Koruja Stream HUD — Editor Visual da Live",
      icon: "fa-solid fa-video",
      resizable: true
    },
    position: {
      width: 860,
      height: "auto"
    },
    form: {
      handler: StreamPartyConfigApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  #draftPositions = null;

  async _prepareContext() {
    const selectedIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    const overlayMode = game.settings.get(MODULE_ID, "overlayMode") || "builtin-sanguis";
    const customOverlayImg = game.settings.get(MODULE_ID, "customOverlayImg") || "";
    const showChatFeed = game.settings.get(MODULE_ID, "showChatFeed");
    const showCombatBox = game.settings.get(MODULE_ID, "showCombatBox");
    const previewMode = game.settings.get(MODULE_ID, "previewInGM") || false;
    const savedPositions = game.settings.get(MODULE_ID, "cardPositions") || {};

    this.#draftPositions = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_POSITIONS),
      foundry.utils.deepClone(savedPositions)
    );

    const characters = game.actors
      .filter(a => a.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      characters,
      selectedIds,
      overlayMode,
      customOverlayImg,
      showChatFeed,
      showCombatBox,
      previewMode,
      positions: this.#draftPositions
    };
  }

  async _renderHTML(context) {
    const container = document.createElement("div");
    container.classList.add("koruja-hud-editor-wrap");

    const charRows = context.characters.map(actor => {
      const idx = context.selectedIds.indexOf(actor.id);
      const checked = idx !== -1 ? "checked" : "";
      const order = idx !== -1 ? idx + 1 : "";
      const hp = actor.system?.attributes?.hp;
      const ac = actor.system?.attributes?.ac?.value ?? 10;
      return `
        <label class="koruja-config-row">
          <input type="checkbox" name="actor_${actor.id}" value="${actor.id}" ${checked}>
          <img src="${actor.img}" alt="${actor.name}">
          <div class="koruja-config-info">
            <strong>${actor.name}</strong>
            <span>PV: ${hp?.value ?? 0}/${hp?.max ?? 0} | CA: ${ac}</span>
          </div>
          <input type="number" class="koruja-order-input" name="order_${actor.id}" value="${order}" min="1" max="4" placeholder="#">
        </label>
      `;
    }).join("");

    const streamUrl = `${window.location.origin}/?streamhud=1`;
    const pos = context.positions;

    // Escala do preview: 800x450 (exatamente 1920x1080 * 0.416667)
    const SCALE = 800 / 1920;

    container.innerHTML = `
      <div class="koruja-editor-grid">
        <!-- Coluna Esquerda: Jogadores e Opções -->
        <div class="koruja-editor-sidebar">
          <div class="koruja-section-title"><i class="fa-solid fa-users"></i> Jogadores (1 a 4)</div>
          <div class="koruja-config-list">
            ${charRows || "<p class='notes'>Nenhum personagem (Character) encontrado.</p>"}
          </div>

          <div class="koruja-section-title" style="margin-top: 8px;"><i class="fa-solid fa-image"></i> Fundo / Moldura da Overlay</div>
          <div class="form-group stacked">
            <select name="overlayMode" id="koruja-overlay-mode-select">
              <option value="builtin-sanguis" ${context.overlayMode === "builtin-sanguis" ? "selected" : ""}>Moldura Embutida (Sanguis et Thus)</option>
              <option value="custom-image" ${context.overlayMode === "custom-image" ? "selected" : ""}>Minha Imagem PNG/WebP Customizada</option>
              <option value="none" ${context.overlayMode === "none" ? "selected" : ""}>Sem Fundo (Apenas Cards Transparentes)</option>
            </select>
          </div>

          <div class="form-group stacked" id="koruja-custom-img-group" style="${context.overlayMode === "custom-image" ? "" : "display:none;"}">
            <label>Imagem do Overlay (1920x1080):</label>
            <div class="koruja-filepicker-row">
              <input type="text" name="customOverlayImg" id="koruja-custom-img-input" value="${context.customOverlayImg}" placeholder="Selecione ou envie uma imagem...">
              <button type="button" class="koruja-browse-btn" title="Escolher / Enviar Imagem"><i class="fa-solid fa-file-import"></i></button>
            </div>
          </div>

          <label class="koruja-check-row">
            <input type="checkbox" name="showChatFeed" ${context.showChatFeed ? "checked" : ""}>
            <span>Mostrar Caixa de Rolagens ao Vivo</span>
          </label>
          <label class="koruja-check-row">
            <input type="checkbox" name="showCombatBox" ${context.showCombatBox ? "checked" : ""}>
            <span>Mostrar Caixa de Rodada / Turno</span>
          </label>
          <label class="koruja-check-row">
            <input type="checkbox" name="previewInGM" ${context.previewMode ? "checked" : ""}>
            <span>Pré-visualizar na minha tela de Mestre</span>
          </label>
        </div>

        <!-- Coluna Direita: Editor Visual Drag & Drop (800x450 = escala de 1920x1080) -->
        <div class="koruja-editor-stage-wrap">
          <div class="koruja-stage-header">
            <span><i class="fa-solid fa-up-down-left-right"></i> Arraste os cards sobre a imagem para posicionar (1920×1080)</span>
            <button type="button" class="koruja-reset-pos-btn"><i class="fa-solid fa-rotate-left"></i> Resetar Padrão</button>
          </div>

          <div class="koruja-preview-stage" id="koruja-preview-stage">
            <!-- Prévia do fundo escolhido -->
            <div class="koruja-stage-bg-builtin" style="${context.overlayMode === "builtin-sanguis" ? "" : "display:none;"}">
              <div class="mini-header">SANGUIS ET THUS — MOLDURA EMBUTIDA</div>
              <div class="mini-slot-foundry">MAPA DO FOUNDRY VTT</div>
              <div class="mini-slot-gm">CÂMERA MESTRE</div>
              <div class="mini-cam p1">CAM 1</div>
              <div class="mini-cam p2">CAM 2</div>
              <div class="mini-cam p3">CAM 3</div>
              <div class="mini-cam p4">CAM 4</div>
            </div>
            <img class="koruja-stage-bg-custom" id="koruja-stage-bg-custom" src="${context.customOverlayImg}" style="${context.overlayMode === "custom-image" && context.customOverlayImg ? "" : "display:none;"}">

            <!-- Caixas arrastáveis -->
            ${["p1", "p2", "p3", "p4"].map((key, i) => `
              <div class="koruja-drag-box drag-player" data-key="${key}" style="left:${Math.round(pos[key].x * SCALE)}px; top:${Math.round(pos[key].y * SCALE)}px;">
                <i class="fa-solid fa-grip-vertical"></i> Jogador ${i + 1}
              </div>
            `).join("")}

            <div class="koruja-drag-box drag-chat" data-key="chat" style="left:${Math.round(pos.chat.x * SCALE)}px; top:${Math.round(pos.chat.y * SCALE)}px; ${context.showChatFeed ? "" : "opacity:0.35;"}">
              <i class="fa-solid fa-dice-d20"></i> Rolagens & Chat
            </div>

            <div class="koruja-drag-box drag-combat" data-key="combat" style="left:${Math.round(pos.combat.x * SCALE)}px; top:${Math.round(pos.combat.y * SCALE)}px; ${context.showCombatBox ? "" : "opacity:0.35;"}">
              <i class="fa-solid fa-swords"></i> Rodada / Turno
            </div>
          </div>

          <div class="koruja-url-box">
            <label><i class="fa-solid fa-link"></i> Link Único para o OBS (Fonte de Navegador 1920x1080):</label>
            <input type="text" readonly value="${streamUrl}" onclick="this.select(); navigator.clipboard.writeText(this.value); ui.notifications.info('URL copiada para o OBS!');">
          </div>
        </div>
      </div>

      <input type="hidden" name="positionsJson" id="koruja-positions-json" value='${JSON.stringify(pos)}'>

      <footer class="sheet-footer flexrow" style="margin-top: 10px;">
        <button type="submit" class="koruja-save-btn">
          <i class="fa-solid fa-floppy-disk"></i> Salvar Tudo e Atualizar Live
        </button>
      </footer>
    `;

    this.#bindEditorEvents(container, SCALE);
    return container;
  }

  #bindEditorEvents(container, SCALE) {
    const modeSelect = container.querySelector("#koruja-overlay-mode-select");
    const customGroup = container.querySelector("#koruja-custom-img-group");
    const customInput = container.querySelector("#koruja-custom-img-input");
    const builtinBg = container.querySelector(".koruja-stage-bg-builtin");
    const customBg = container.querySelector("#koruja-stage-bg-custom");
    const browseBtn = container.querySelector(".koruja-browse-btn");
    const resetBtn = container.querySelector(".koruja-reset-pos-btn");
    const hiddenJson = container.querySelector("#koruja-positions-json");
    const stage = container.querySelector("#koruja-preview-stage");

    modeSelect?.addEventListener("change", () => {
      const val = modeSelect.value;
      customGroup.style.display = val === "custom-image" ? "" : "none";
      builtinBg.style.display = val === "builtin-sanguis" ? "" : "none";
      customBg.style.display = val === "custom-image" && customInput.value ? "" : "none";
    });

    customInput?.addEventListener("change", () => {
      customBg.src = customInput.value;
      customBg.style.display = modeSelect.value === "custom-image" && customInput.value ? "" : "none";
    });

    browseBtn?.addEventListener("click", () => {
      const FP = foundry.applications?.apps?.FilePicker?.implementation || FilePicker;
      new FP({
        type: "image",
        current: customInput.value || "",
        callback: (path) => {
          customInput.value = path;
          customBg.src = path;
          customBg.style.display = "block";
        }
      }).browse();
    });

    resetBtn?.addEventListener("click", () => {
      this.#draftPositions = foundry.utils.deepClone(DEFAULT_POSITIONS);
      hiddenJson.value = JSON.stringify(this.#draftPositions);
      container.querySelectorAll(".koruja-drag-box").forEach(box => {
        const key = box.dataset.key;
        box.style.left = `${Math.round(this.#draftPositions[key].x * SCALE)}px`;
        box.style.top = `${Math.round(this.#draftPositions[key].y * SCALE)}px`;
      });
      ui.notifications.info("Posições restauradas para o padrão.");
    });

    // Drag & Drop fluido no palco de prévia
    container.querySelectorAll(".koruja-drag-box").forEach(box => {
      box.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const key = box.dataset.key;
        const startX = e.clientX;
        const startY = e.clientY;
        const origLeft = parseFloat(box.style.left) || 0;
        const origTop = parseFloat(box.style.top) || 0;
        const maxLeft = stage.clientWidth - box.offsetWidth;
        const maxTop = stage.clientHeight - box.offsetHeight;

        const onMove = (ev) => {
          const newLeft = Math.max(0, Math.min(maxLeft, origLeft + (ev.clientX - startX)));
          const newTop = Math.max(0, Math.min(maxTop, origTop + (ev.clientY - startY)));
          box.style.left = `${Math.round(newLeft)}px`;
          box.style.top = `${Math.round(newTop)}px`;
          this.#draftPositions[key] = {
            x: Math.round(newLeft / SCALE),
            y: Math.round(newTop / SCALE)
          };
          hiddenJson.value = JSON.stringify(this.#draftPositions);
        };

        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    });
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    const selected = [];

    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith("actor_") && val) {
        const actorId = key.replace("actor_", "");
        const orderVal = Number(data[`order_${actorId}`]) || 99;
        selected.push({ id: actorId, order: orderVal });
      }
    }

    selected.sort((a, b) => a.order - b.order);
    const orderedIds = selected.map(s => s.id);

    let parsedPositions = DEFAULT_POSITIONS;
    try {
      if (data.positionsJson) parsedPositions = JSON.parse(data.positionsJson);
    } catch (err) {
      console.warn("Koruja Stream HUD: erro ao ler posições:", err);
    }

    await game.settings.set(MODULE_ID, "partyActorIds", orderedIds);
    await game.settings.set(MODULE_ID, "overlayMode", data.overlayMode || "builtin-sanguis");
    await game.settings.set(MODULE_ID, "customOverlayImg", data.customOverlayImg || "");
    await game.settings.set(MODULE_ID, "showChatFeed", Boolean(data.showChatFeed));
    await game.settings.set(MODULE_ID, "showCombatBox", Boolean(data.showCombatBox));
    await game.settings.set(MODULE_ID, "previewInGM", Boolean(data.previewInGM));
    await game.settings.set(MODULE_ID, "cardPositions", parsedPositions);

    ui.notifications.info(`Stream HUD salvo (${orderedIds.length} jogadores).`);
    KorujaStreamHUD.init();
  }
}

/**
 * Controlador principal da Overlay Integrada no Foundry.
 */
class KorujaStreamHUD {
  static container = null;
  static hpCache = new Map();
  static rollTimers = new Map();
  static chatHistory = [];

  static init() {
    if (!this.shouldRender()) {
      this.destroy();
      return;
    }

    if (isStreamMode() && game.settings.get(MODULE_ID, "hideFoundryUI")) {
      document.body.classList.add("koruja-stream-mode-active");
    } else {
      document.body.classList.remove("koruja-stream-mode-active");
    }

    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "koruja-stream-hud";
      document.body.appendChild(this.container);
    }

    this.loadRecentMessages();
    this.render();
  }

  static shouldRender() {
    if (isStreamMode()) return true;
    if (game.user?.isGM && game.settings.get(MODULE_ID, "previewInGM")) return true;
    return false;
  }

  static destroy() {
    document.body.classList.remove("koruja-stream-mode-active");
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  static loadRecentMessages() {
    const publicMsgs = game.messages.contents
      .filter(m => !m.blind && (!m.whisper || m.whisper.length === 0))
      .slice(-8);

    this.chatHistory = publicMsgs.map(m => this.#formatChatMessage(m)).filter(Boolean);
  }

  static #formatChatMessage(message) {
    const author = message.speaker?.alias || message.author?.name || "Aventureiro";
    if (message.rolls?.length > 0) {
      const roll = message.rolls[0];
      const critClass = roll.isCritical ? "crit" : roll.isFumble ? "fumble" : "";
      const badge = roll.isCritical ? " ⭐ CRÍTICO!" : roll.isFumble ? " 💀 FALHA CRÍTICA!" : "";
      return {
        author,
        text: `🎲 Rolou <strong>${roll.total}</strong> <span class="roll-sub">(${roll.formula})${badge}</span>`,
        type: critClass
      };
    }

    // Limpa HTML simples de mensagens públicas de fala/descrição
    const temp = document.createElement("div");
    temp.innerHTML = message.content || "";
    const plain = temp.textContent?.trim();
    if (!plain) return null;
    const truncated = plain.length > 110 ? `${plain.slice(0, 107)}...` : plain;
    return { author, text: truncated, type: "" };
  }

  static render(flashEvents = {}) {
    if (!this.shouldRender()) {
      this.destroy();
      return;
    }
    if (!this.container) this.init();

    const overlayMode = game.settings.get(MODULE_ID, "overlayMode") || "builtin-sanguis";
    const customOverlayImg = game.settings.get(MODULE_ID, "customOverlayImg") || "";
    const showHP = game.settings.get(MODULE_ID, "showHP");
    const showAC = game.settings.get(MODULE_ID, "showAC");
    const showConditions = game.settings.get(MODULE_ID, "showConditions");
    const showChatFeed = game.settings.get(MODULE_ID, "showChatFeed");
    const showCombatBox = game.settings.get(MODULE_ID, "showCombatBox");

    const pos = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_POSITIONS),
      foundry.utils.deepClone(game.settings.get(MODULE_ID, "cardPositions") || {})
    );

    const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    const actors = actorIds.slice(0, 4).map(id => game.actors.get(id)).filter(Boolean);
    const activeCombatant = game.combat?.started ? game.combat.combatant : null;
    const activeCombatantActorId = activeCombatant?.actor?.id || null;

    // 1. Camada de Fundo / Moldura
    let backdropHtml = "";
    if (overlayMode === "builtin-sanguis") {
      const sceneName = game.scenes?.active?.name || "Sanguis et Thus";
      const crestPath = `modules/${MODULE_ID}/assets/crest.png`;
      backdropHtml = `
        <div class="koruja-builtin-frame">
          <div class="koruja-top-bar">
            <div class="top-left">
              <img src="${crestPath}" onerror="this.style.display='none'">
              <span>SANGUIS ET THUS</span>
            </div>
            <div class="top-center">⚔️ ${sceneName.toUpperCase()}</div>
            <div class="top-right"><span class="live-dot"></span> AO VIVO • D&D 5E</div>
          </div>

          <div class="koruja-cutout koruja-cutout-foundry"></div>
          <div class="koruja-cutout koruja-cutout-gm">
            <div class="cutout-tag">MESTRE</div>
          </div>
          <div class="koruja-cutout koruja-cutout-p1"><div class="cutout-tag">JOGADOR 1</div></div>
          <div class="koruja-cutout koruja-cutout-p2"><div class="cutout-tag">JOGADOR 2</div></div>
          <div class="koruja-cutout koruja-cutout-p3"><div class="cutout-tag">JOGADOR 3</div></div>
          <div class="koruja-cutout koruja-cutout-p4"><div class="cutout-tag">JOGADOR 4</div></div>

          <div class="koruja-bottom-bar">
            <span>CAMPANHA: SANGUIS ET THUS</span>
            <span class="motto">"Ubi Sanguis, Ibi Thus — Onde há Sangue, há Incenso"</span>
            <span>FOUNDRY VTT LIVE</span>
          </div>
        </div>
      `;
    } else if (overlayMode === "custom-image" && customOverlayImg) {
      backdropHtml = `<img class="koruja-custom-overlay-bg" src="${customOverlayImg}" alt="Overlay">`;
    }

    // 2. Cards dos Jogadores nas posições exatas
    const cardsHtml = actors.map((actor, index) => {
      const slotKey = `p${index + 1}`;
      const coords = pos[slotKey] || DEFAULT_POSITIONS[slotKey];

      const hp = actor.system?.attributes?.hp || { value: 0, max: 1, temp: 0 };
      const hpMax = Math.max(1, Number(hp.max) || 1);
      const hpVal = Math.max(0, Number(hp.value) || 0);
      const hpTemp = Math.max(0, Number(hp.temp) || 0);
      const hpPct = Math.min(100, Math.round((hpVal / hpMax) * 100));
      const ac = actor.system?.attributes?.ac?.value ?? 10;
      const level = actor.system?.details?.level ?? 1;

      this.hpCache.set(actor.id, hpVal);

      const isTurn = activeCombatantActorId === actor.id;
      const isDown = hpVal === 0;
      const isBloodied = hpPct > 0 && hpPct <= 50;
      const flashClass = flashEvents[actor.id] ? `flash-${flashEvents[actor.id]}` : "";
      const barColorClass = hpPct <= 25 ? "hp-critical" : hpPct <= 50 ? "hp-bloodied" : "hp-healthy";

      let conditionsHtml = "";
      if (showConditions && actor.statuses?.size > 0) {
        const badges = Array.from(actor.statuses).slice(0, 5).map(statusId => {
          const eff = CONFIG.statusEffects.find(e => e.id === statusId);
          if (!eff) return "";
          const label = game.i18n.localize(eff.name || eff.label || statusId);
          return `<img class="koruja-cond-icon" src="${eff.img}" title="${label}" alt="${label}">`;
        }).join("");
        if (badges) conditionsHtml = `<div class="koruja-card-conditions">${badges}</div>`;
      }

      return `
        <div class="koruja-player-card ${isTurn ? "is-active-turn" : ""} ${isDown ? "is-down" : ""} ${flashClass}"
             style="left: ${coords.x}px; top: ${coords.y}px;" data-actor-id="${actor.id}">
          <div class="koruja-roll-toast" id="koruja-roll-${actor.id}"></div>
          <div class="koruja-card-inner">
            <div class="koruja-portrait-wrap">
              <img class="koruja-portrait ${isBloodied ? "bloodied" : ""}" src="${actor.img}" alt="${actor.name}">
              ${isTurn ? `<div class="koruja-turn-badge">TURNO</div>` : ""}
              ${showAC ? `
                <div class="koruja-ac-badge">
                  <i class="fa-solid fa-shield"></i>
                  <span>${ac}</span>
                </div>
              ` : ""}
            </div>
            <div class="koruja-stats-wrap">
              <div class="koruja-name-row">
                <span class="koruja-char-name">${actor.name}</span>
                <span class="koruja-char-lvl">Nv ${level}</span>
              </div>
              ${showHP ? `
                <div class="koruja-hp-bar-outer">
                  <div class="koruja-hp-bar-fill ${barColorClass}" style="width: ${hpPct}%"></div>
                  <div class="koruja-hp-text">${hpVal} / ${hpMax}${hpTemp > 0 ? ` <span class="hp-temp">(+${hpTemp})</span>` : ""}</div>
                </div>
              ` : ""}
              ${conditionsHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // 3. Caixa de Rolagens & Chat ao Vivo do Foundry
    let chatHtml = "";
    if (showChatFeed) {
      const chatCoords = pos.chat || DEFAULT_POSITIONS.chat;
      const msgs = this.chatHistory.slice(-7).map(m => `
        <div class="koruja-feed-msg ${m.type}">
          <div class="feed-author">${m.author}</div>
          <div class="feed-text">${m.text}</div>
        </div>
      `).join("");
      chatHtml = `
        <div class="koruja-chat-feed-box" style="left: ${chatCoords.x}px; top: ${chatCoords.y}px;">
          <div class="feed-header">📜 ROLAGENS & EVENTOS</div>
          <div class="feed-body">${msgs || `<div class="feed-empty">Aguardando rolagens na mesa...</div>`}</div>
        </div>
      `;
    }

    // 4. Caixa de Rodada / Turno Ativo
    let combatHtml = "";
    if (showCombatBox) {
      const combatCoords = pos.combat || DEFAULT_POSITIONS.combat;
      const roundText = game.combat?.started ? `RODADA ${String(game.combat.round).padStart(2, "0")}` : "EXPLORAÇÃO";
      const turnText = game.combat?.started && activeCombatant ? `Turno: ${activeCombatant.name}` : "Fora de Combate";
      combatHtml = `
        <div class="koruja-combat-box" style="left: ${combatCoords.x}px; top: ${combatCoords.y}px;">
          <div class="combat-label">INICIATIVA</div>
          <div class="combat-round">${roundText}</div>
          <div class="combat-turn">${turnText}</div>
        </div>
      `;
    }

    this.container.innerHTML = `${backdropHtml}${cardsHtml}${chatHtml}${combatHtml}`;
  }

  static showRollToast(actorId, roll) {
    if (!this.shouldRender() || !game.settings.get(MODULE_ID, "showRolls")) return;
    const toastEl = document.getElementById(`koruja-roll-${actorId}`);
    if (!toastEl) return;

    const tag = roll.isCritical ? "CRÍTICO!" : roll.isFumble ? "FALHA CRÍTICA" : "";
    const badgeClass = roll.isCritical ? "roll-crit" : roll.isFumble ? "roll-fumble" : "";

    toastEl.className = `koruja-roll-toast visible ${badgeClass}`;
    toastEl.innerHTML = `
      <span class="roll-icon">🎲</span>
      <span class="roll-total">${roll.total}</span>
      ${tag ? `<span class="roll-tag">${tag}</span>` : `<span class="roll-formula">${roll.formula || ""}</span>`}
    `;

    if (this.rollTimers.has(actorId)) clearTimeout(this.rollTimers.get(actorId));
    const timer = setTimeout(() => {
      const el = document.getElementById(`koruja-roll-${actorId}`);
      if (el) el.classList.remove("visible");
    }, 6000);
    this.rollTimers.set(actorId, timer);
  }

  static pushChatMessage(message) {
    const formatted = this.#formatChatMessage(message);
    if (!formatted) return;
    this.chatHistory.push(formatted);
    if (this.chatHistory.length > 10) this.chatHistory.shift();
    this.render();
  }
}

/* =========================================================
 * INICIALIZAÇÃO E HOOKS DO FOUNDRY VTT v14
 * ========================================================= */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "partyActorIds", { scope: "world", config: false, type: Array, default: [], onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "overlayMode", { scope: "world", config: false, type: String, default: "builtin-sanguis", onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "customOverlayImg", { scope: "world", config: false, type: String, default: "", onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showChatFeed", { scope: "world", config: false, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showCombatBox", { scope: "world", config: false, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "cardPositions", { scope: "world", config: false, type: Object, default: DEFAULT_POSITIONS, onChange: () => KorujaStreamHUD.render() });

  game.settings.register(MODULE_ID, "streamUser", {
    name: "Nome do Usuário da Transmissão (OBS)",
    hint: "Qualquer cliente conectado com este nome (ou usando ?streamhud=1 na URL) ativa o modo overlay transparente.",
    scope: "world",
    config: true,
    type: String,
    default: "Stream",
    onChange: () => KorujaStreamHUD.init()
  });

  game.settings.register(MODULE_ID, "hideFoundryUI", {
    name: "Ocultar Interface do Foundry no Modo Stream",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => KorujaStreamHUD.init()
  });

  game.settings.register(MODULE_ID, "showHP", { name: "Exibir Barra de Vida (PV)", scope: "world", config: true, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showAC", { name: "Exibir Classe de Armadura (CA)", scope: "world", config: true, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showConditions", { name: "Exibir Ícones de Condições", scope: "world", config: true, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showRolls", { name: "Exibir Popup de Rolagem nos Cards", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "previewInGM", { name: "Pré-visualizar Overlay na minha tela de Mestre", scope: "client", config: true, type: Boolean, default: false, onChange: () => KorujaStreamHUD.init() });

  game.settings.registerMenu(MODULE_ID, "partyConfigMenu", {
    name: "Editor Visual da Live",
    label: "Abrir Editor de Overlay & Posições",
    hint: "Escolha os jogadores, suba uma imagem de overlay e arraste os cards na tela.",
    icon: "fa-solid fa-video",
    type: StreamPartyConfigApp,
    restricted: true
  });

  game.korujaStreamHud = {
    openConfig: () => new StreamPartyConfigApp().render({ force: true }),
    refresh: () => KorujaStreamHUD.render()
  };
});

Hooks.once("ready", () => KorujaStreamHUD.init());

Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user?.isGM) return;
  const headerActions = html.querySelector?.(".header-actions") || html[0]?.querySelector(".header-actions");
  if (!headerActions || headerActions.querySelector(".koruja-stream-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "koruja-stream-btn";
  btn.innerHTML = `<i class="fa-solid fa-video"></i> Stream HUD`;
  btn.title = "Abrir Editor Visual da Overlay";
  btn.addEventListener("click", () => game.korujaStreamHud.openConfig());
  headerActions.appendChild(btn);
});

Hooks.on("updateActor", (actor) => {
  const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
  if (!actorIds.includes(actor.id)) return;

  const newHp = Number(actor.system?.attributes?.hp?.value ?? 0);
  const oldHp = KorujaStreamHUD.hpCache.get(actor.id);
  const flash = {};
  if (oldHp !== undefined) {
    if (newHp < oldHp) flash[actor.id] = "damage";
    else if (newHp > oldHp) flash[actor.id] = "heal";
  }
  KorujaStreamHUD.render(flash);
});

Hooks.on("createActiveEffect", (e) => { if (e.parent?.documentName === "Actor") KorujaStreamHUD.render(); });
Hooks.on("deleteActiveEffect", (e) => { if (e.parent?.documentName === "Actor") KorujaStreamHUD.render(); });
Hooks.on("updateActiveEffect", (e) => { if (e.parent?.documentName === "Actor") KorujaStreamHUD.render(); });
Hooks.on("updateCombat", () => KorujaStreamHUD.render());
Hooks.on("deleteCombat", () => KorujaStreamHUD.render());

Hooks.on("createChatMessage", (message) => {
  if (message.whisper?.length > 0 || message.blind) return;
  KorujaStreamHUD.pushChatMessage(message);

  if (message.rolls?.length > 0) {
    const actorId = message.speaker?.actor;
    const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    if (actorId && actorIds.includes(actorId)) {
      KorujaStreamHUD.showRollToast(actorId, message.rolls[0]);
    }
  }
});
