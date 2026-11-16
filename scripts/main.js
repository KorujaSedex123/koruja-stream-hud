const MODULE_ID = "koruja-stream-hud";

const DEFAULT_POSITIONS = {
  p1: { x: 20, y: 976 },
  p2: { x: 258, y: 976 },
  p3: { x: 496, y: 976 },
  p4: { x: 734, y: 976 },
  p5: { x: 972, y: 976 },
  p6: { x: 1210, y: 976 },
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
    const autoPanCombat = game.settings.get(MODULE_ID, "autoPanCombat");
    const cinematicHandouts = game.settings.get(MODULE_ID, "cinematicHandouts");
    const bossActorId = game.settings.get(MODULE_ID, "bossActorId") || "";
    const savedPositions = game.settings.get(MODULE_ID, "cardPositions") || {};

    this.#draftPositions = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_POSITIONS),
      foundry.utils.deepClone(savedPositions)
    );

    const characters = game.actors
      .filter(a => a.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));

    const npcs = game.actors
      .filter(a => a.type === "npc")
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      characters,
      npcs,
      selectedIds,
      overlayMode,
      customOverlayImg,
      showChatFeed,
      showCombatBox,
      autoPanCombat,
      cinematicHandouts,
      bossActorId,
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
          <input type="number" class="koruja-order-input" name="order_${actor.id}" value="${order}" min="1" max="6" placeholder="#">
        </label>
      `;
    }).join("");

    const bossOptions = context.npcs.map(npc => {
      const sel = npc.id === context.bossActorId ? "selected" : "";
      return `<option value="${npc.id}" ${sel}>${npc.name}</option>`;
    }).join("");
    const activeTokenBoss = context.bossActorId?.includes(".") ? fromUuidSync(context.bossActorId) : null;
    const activeTokenOption = activeTokenBoss
      ? `<option value="${context.bossActorId}" selected>👑 Token no Mapa: ${activeTokenBoss.name}</option>`
      : "";

    const streamUrl = `${window.location.origin}/?streamhud=1`;
    const pos = context.positions;
    const SCALE = 800 / 1920;

    container.innerHTML = `
      <div class="koruja-editor-grid">
        <!-- Coluna Esquerda: Jogadores e Opções -->
        <div class="koruja-editor-sidebar">
          <div class="koruja-section-title"><i class="fa-solid fa-users"></i> Jogadores (1 a 6)</div>
          <div class="koruja-config-list">
            ${charRows || "<p class='notes'>Nenhum personagem (Character) encontrado.</p>"}
          </div>

          <div class="koruja-section-title" style="margin-top: 6px;"><i class="fa-solid fa-crown"></i> Barra de Chefe (Boss HP)</div>
          <div class="form-group stacked">
            <select name="bossActorId">
              <option value="">— Nenhum Chefe Ativo —</option>
              ${activeTokenOption}
              ${bossOptions}
            </select>
            <p class="notes" style="font-size:10px; opacity:0.75; margin:2px 0 0;">Dica: clique com o botão direito em qualquer token no mapa e clique no ícone de Coroa para ativar/desativar na hora!</p>
          </div>

          <div class="koruja-section-title" style="margin-top: 6px;"><i class="fa-solid fa-image"></i> Fundo / Moldura da Overlay</div>
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
            <span>Caixa de Rolagens ao Vivo</span>
          </label>
          <label class="koruja-check-row">
            <input type="checkbox" name="showCombatBox" ${context.showCombatBox ? "checked" : ""}>
            <span>Caixa de Rodada / Turno</span>
          </label>
          <label class="koruja-check-row">
            <input type="checkbox" name="autoPanCombat" ${context.autoPanCombat ? "checked" : ""}>
            <span>Câmera Segue o Turno no Combate</span>
          </label>
          <label class="koruja-check-row">
            <input type="checkbox" name="cinematicHandouts" ${context.cinematicHandouts ? "checked" : ""}>
            <span>Vitrine Cinematográfica de Imagens/NPCs</span>
          </label>

          <button type="button" class="koruja-open-window-btn" id="koruja-open-live-tab">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Tela da Live (Nova Aba)
          </button>

          <div class="koruja-test-btn-row">
            <button type="button" class="koruja-test-btn test-crit" id="koruja-test-crit">
              <i class="fa-solid fa-star"></i> Testar Crítico
            </button>
            <button type="button" class="koruja-test-btn test-fumble" id="koruja-test-fumble">
              <i class="fa-solid fa-skull"></i> Testar Falha Crítica
            </button>
          </div>
        </div>

        <!-- Coluna Direita: Editor Visual Drag & Drop (800x450 = escala de 1920x1080) -->
        <div class="koruja-editor-stage-wrap">
          <div class="koruja-stage-header">
            <span><i class="fa-solid fa-up-down-left-right"></i> Arraste os cards sobre a imagem para posicionar (1920×1080)</span>
            <button type="button" class="koruja-reset-pos-btn"><i class="fa-solid fa-rotate-left"></i> Resetar Padrão</button>
          </div>

          <div class="koruja-preview-stage" id="koruja-preview-stage">
            <div class="koruja-stage-bg-builtin" style="${context.overlayMode === "builtin-sanguis" ? "" : "display:none;"}">
              <div class="mini-header">SANGUIS ET THUS — MOLDURA EMBUTIDA</div>
              <div class="mini-slot-foundry">MAPA DO FOUNDRY VTT</div>
              <div class="mini-slot-gm">CÂMERA MESTRE</div>
              <div class="mini-cam p1">CAM 1</div>
              <div class="mini-cam p2">CAM 2</div>
              <div class="mini-cam p3">CAM 3</div>
              <div class="mini-cam p4">CAM 4</div>
              <div class="mini-cam p5">CAM 5</div>
              <div class="mini-cam p6">CAM 6</div>
            </div>
            <img class="koruja-stage-bg-custom" id="koruja-stage-bg-custom" src="${context.customOverlayImg}" style="${context.overlayMode === "custom-image" && context.customOverlayImg ? "" : "display:none;"}">

            ${["p1", "p2", "p3", "p4", "p5", "p6"].map((key, i) => `
              <div class="koruja-drag-box drag-player" data-key="${key}" style="left:${Math.round(pos[key].x * SCALE)}px; top:${Math.round(pos[key].y * SCALE)}px;">
                <i class="fa-solid fa-grip-vertical"></i> J${i + 1}
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
    const openTabBtn = container.querySelector("#koruja-open-live-tab");
    const testCritBtn = container.querySelector("#koruja-test-crit");
    const testFumbleBtn = container.querySelector("#koruja-test-fumble");
    const hiddenJson = container.querySelector("#koruja-positions-json");
    const stage = container.querySelector("#koruja-preview-stage");

    openTabBtn?.addEventListener("click", () => {
      window.open(`${window.location.origin}/?streamhud=1`, "_blank", "width=1920,height=1080");
    });

    const sendTestBanner = (type) => {
      const selectedIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
      const firstActor = selectedIds.length ? game.actors.get(selectedIds[0]) : game.actors.find(a => a.type === "character");
      const payload = {
        action: "test-epic-banner",
        type,
        name: firstActor?.name || "Herói de Teste",
        img: firstActor?.img || ""
      };
      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel(MODULE_ID);
        ch.postMessage(payload);
        ch.close();
      }
      ui.notifications.info(`Alerta de ${type === "crit" ? "Acerto Crítico" : "Falha Crítica"} enviado para a aba da Live!`);
    };

    testCritBtn?.addEventListener("click", () => sendTestBanner("crit"));
    testFumbleBtn?.addEventListener("click", () => sendTestBanner("fumble"));

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
    await game.settings.set(MODULE_ID, "bossActorId", data.bossActorId || "");
    await game.settings.set(MODULE_ID, "overlayMode", data.overlayMode || "builtin-sanguis");
    await game.settings.set(MODULE_ID, "customOverlayImg", data.customOverlayImg || "");
    await game.settings.set(MODULE_ID, "showChatFeed", Boolean(data.showChatFeed));
    await game.settings.set(MODULE_ID, "showCombatBox", Boolean(data.showCombatBox));
    await game.settings.set(MODULE_ID, "autoPanCombat", Boolean(data.autoPanCombat));
    await game.settings.set(MODULE_ID, "cinematicHandouts", Boolean(data.cinematicHandouts));
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
  static epicBannerEl = null;
  static epicBannerTimer = null;
  static spotlightEl = null;
  static spotlightTimer = null;
  static broadcastChannel = null;
  static lastBossHpPct = null;

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

    if (!this.broadcastChannel && typeof BroadcastChannel !== "undefined") {
      this.broadcastChannel = new BroadcastChannel(MODULE_ID);
      this.broadcastChannel.onmessage = (ev) => {
        if (ev.data?.action === "test-epic-banner") {
          this.showEpicBanner(ev.data.type, { name: ev.data.name, img: ev.data.img });
        }
      };
    }

    this.loadRecentMessages();
    this.render();
  }

  static shouldRender() {
    return isStreamMode();
  }

  static destroy() {
    document.body.classList.remove("koruja-stream-mode-active");
    if (this.epicBannerTimer) clearTimeout(this.epicBannerTimer);
    if (this.spotlightTimer) clearTimeout(this.spotlightTimer);
    this.epicBannerEl = null;
    this.spotlightEl = null;
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  static loadRecentMessages() {
    const publicMsgs = game.messages.contents
      .filter(m => !m.blind && (!m.whisper || m.whisper.length === 0))
      .slice(-5);

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

    const temp = document.createElement("div");
    temp.innerHTML = message.content || "";
    const plain = temp.textContent?.trim();
    if (!plain) return null;
    const truncated = plain.length > 90 ? `${plain.slice(0, 87)}...` : plain;
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
    const bossActorId = game.settings.get(MODULE_ID, "bossActorId") || "";

    const pos = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_POSITIONS),
      foundry.utils.deepClone(game.settings.get(MODULE_ID, "cardPositions") || {})
    );

    const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    const actors = actorIds.slice(0, 6).map(id => game.actors.get(id)).filter(Boolean);
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
              <span>${sceneName.toUpperCase()}</span>
            </div>
            <div class="top-right"><span class="live-dot"></span> AO VIVO</div>
          </div>

          <div class="koruja-cutout koruja-cutout-foundry"></div>
          <div class="koruja-cutout koruja-cutout-gm"></div>
          <div class="koruja-cutout koruja-cutout-p1"></div>
          <div class="koruja-cutout koruja-cutout-p2"></div>
          <div class="koruja-cutout koruja-cutout-p3"></div>
          <div class="koruja-cutout koruja-cutout-p4"></div>
          <div class="koruja-cutout koruja-cutout-p5"></div>
          <div class="koruja-cutout koruja-cutout-p6"></div>
        </div>
      `;
    } else if (overlayMode === "custom-image" && customOverlayImg) {
      backdropHtml = `<img class="koruja-custom-overlay-bg" src="${customOverlayImg}" alt="Overlay">`;
    }

    // 2. Barra de Chefe (Boss HP Bar estilo Dark Souls — suporta Token UUID e Actor ID)
    let bossHtml = "";
    let bossActor = null;
    if (bossActorId) {
      if (bossActorId.includes(".")) {
        const doc = fromUuidSync(bossActorId);
        bossActor = doc?.actor || doc || null;
      } else {
        // Se houver um token desse ator na cena ativa, prioriza o token da cena para ler o PV real
        const sceneToken = canvas?.tokens?.placeables?.find(t => t.actor?.id === bossActorId);
        bossActor = sceneToken?.actor || game.actors.get(bossActorId) || null;
      }
    }
    if (bossActor) {
      const bhp = bossActor.system?.attributes?.hp || { value: 0, max: 1 };
      const bMax = Math.max(1, Number(bhp.max) || 1);
      const bVal = Math.max(0, Number(bhp.value) || 0);
      const bPct = Math.min(100, Math.round((bVal / bMax) * 100));
      const trailPct = this.lastBossHpPct !== null && this.lastBossHpPct > bPct ? this.lastBossHpPct : bPct;
      this.lastBossHpPct = bPct;

      const legres = bossActor.system?.resources?.legres;
      let legresHtml = "";
      if (legres && Number(legres.max) > 0) {
        const maxL = Math.min(5, Number(legres.max));
        const valL = Math.max(0, Number(legres.value) || 0);
        const gems = Array.from({ length: maxL }, (_, i) =>
          `<span class="boss-gem ${i < valL ? "active" : "spent"}" title="Resistência Lendária">◆</span>`
        ).join("");
        legresHtml = `<div class="boss-legres">${gems}</div>`;
      }

      bossHtml = `
        <div class="koruja-boss-bar ${bVal === 0 ? "boss-defeated" : ""}">
          <div class="boss-portrait-wrap">
            <img src="${bossActor.img}" alt="${bossActor.name}">
          </div>
          <div class="boss-info-wrap">
            <div class="boss-header-row">
              <span class="boss-name"><i class="fa-solid fa-skull"></i> ${bossActor.name}</span>
              ${legresHtml}
              <span class="boss-hp-num">${bVal === 0 ? "DERROTADO" : `${bVal} / ${bMax}`}</span>
            </div>
            <div class="boss-bar-outer">
              <div class="boss-bar-trail" style="width: ${trailPct}%"></div>
              <div class="boss-bar-fill" style="width: ${bPct}%"></div>
            </div>
          </div>
        </div>
      `;
    } else {
      this.lastBossHpPct = null;
    }

    // 3. Cards dos Jogadores (Death Saves + Concentração + Inspiração)
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
      const isConcentrating = actor.statuses?.has("concentrating") || false;
      const hasInspiration = Boolean(actor.system?.attributes?.inspiration);
      const flashClass = flashEvents[actor.id] ? `flash-${flashEvents[actor.id]}` : "";
      const barColorClass = hpPct <= 25 ? "hp-critical" : hpPct <= 50 ? "hp-bloodied" : "hp-healthy";

      // Death Saves quando 0 PV
      let barOrDeathHtml = "";
      if (showHP) {
        if (isDown) {
          const dsSuccess = Number(actor.system?.attributes?.death?.success) || 0;
          const dsFail = Number(actor.system?.attributes?.death?.failure) || 0;
          const succPips = [0, 1, 2].map(i => `<span class="ds-pip ds-succ ${i < dsSuccess ? "filled" : ""}">🛡️</span>`).join("");
          const failPips = [0, 1, 2].map(i => `<span class="ds-pip ds-fail ${i < dsFail ? "filled" : ""}">💀</span>`).join("");
          barOrDeathHtml = `
            <div class="koruja-death-saves" title="Testes contra a Morte">
              <div class="ds-group">${succPips}</div>
              <span class="ds-divider">MORRENDO</span>
              <div class="ds-group">${failPips}</div>
            </div>
          `;
        } else {
          barOrDeathHtml = `
            <div class="koruja-hp-bar-outer">
              <div class="koruja-hp-bar-fill ${barColorClass}" style="width: ${hpPct}%"></div>
              <div class="koruja-hp-text">${hpVal} / ${hpMax}${hpTemp > 0 ? ` <span class="hp-temp">(+${hpTemp})</span>` : ""}</div>
            </div>
          `;
        }
      }

      let conditionsHtml = "";
      if (showConditions && actor.statuses?.size > 0) {
        const badges = Array.from(actor.statuses).filter(s => s !== "concentrating").slice(0, 5).map(statusId => {
          const eff = CONFIG.statusEffects.find(e => e.id === statusId);
          if (!eff) return "";
          const label = game.i18n.localize(eff.name || eff.label || statusId);
          return `<img class="koruja-cond-icon" src="${eff.img}" title="${label}" alt="${label}">`;
        }).join("");
        if (badges) conditionsHtml = `<div class="koruja-card-conditions">${badges}</div>`;
      }

      return `
        <div class="koruja-player-card ${isTurn ? "is-active-turn" : ""} ${isDown ? "is-down" : ""} ${isConcentrating ? "is-concentrating" : ""} ${flashClass}"
             style="left: ${coords.x}px; top: ${coords.y}px;" data-actor-id="${actor.id}">
          <div class="koruja-roll-toast" id="koruja-roll-${actor.id}"></div>
          <div class="koruja-card-inner">
            <div class="koruja-portrait-wrap">
              <img class="koruja-portrait ${isBloodied ? "bloodied" : ""}" src="${actor.img}" alt="${actor.name}">
              ${isTurn ? `<div class="koruja-turn-badge">TURNO</div>` : ""}
              ${hasInspiration ? `<div class="koruja-insp-badge" title="Inspiração Heroica"><i class="fa-solid fa-dice-d20"></i></div>` : ""}
              ${isConcentrating ? `<div class="koruja-conc-badge" title="Concentrando em Magia"><i class="fa-solid fa-wand-sparkles"></i></div>` : ""}
            </div>
            <div class="koruja-stats-wrap">
              <div class="koruja-name-row">
                <span class="koruja-char-name">${actor.name}</span>
                <div class="koruja-meta-badges">
                  ${showAC ? `<span class="koruja-ac-pill" title="Classe de Armadura"><i class="fa-solid fa-shield-halved"></i> ${ac}</span>` : ""}
                  <span class="koruja-char-lvl">Nv ${level}</span>
                </div>
              </div>
              ${barOrDeathHtml}
              ${conditionsHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // 4. Caixa de Rolagens & Chat ao Vivo
    let chatHtml = "";
    if (showChatFeed) {
      const chatCoords = pos.chat || DEFAULT_POSITIONS.chat;
      const msgs = this.chatHistory.slice(-5).map(m => `
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

    // 5. Caixa de Rodada / Turno Ativo
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

    this.container.innerHTML = `${backdropHtml}${bossHtml}${cardsHtml}${chatHtml}${combatHtml}`;
    if (this.epicBannerEl) this.container.appendChild(this.epicBannerEl);
    if (this.spotlightEl) this.container.appendChild(this.spotlightEl);
  }

  static detectCriticalOrFumble(roll) {
    if (!roll) return null;

    if (roll.isCritical) return "crit";
    if (roll.isFumble) return "fumble";

    const dice = Array.isArray(roll.dice) ? roll.dice : [];
    for (const die of dice) {
      if (die?.faces !== 20) continue;
      const critThreshold = Number(die?.options?.critical) || 20;
      const fumbleThreshold = Number(die?.options?.fumble) || 1;
      const results = Array.isArray(die.results) ? die.results : [];
      for (const r of results) {
        if (r?.active === false) continue;
        if (r?.result >= critThreshold) return "crit";
        if (r?.result <= fumbleThreshold) return "fumble";
      }
    }

    return null;
  }

  static showEpicBanner(type, { name = "Aventureiro", img = "" } = {}) {
    if (!this.shouldRender() || !this.container) return;

    if (this.epicBannerTimer) clearTimeout(this.epicBannerTimer);
    if (this.epicBannerEl) this.epicBannerEl.remove();

    const isCrit = type === "crit";
    const banner = document.createElement("div");
    banner.className = `koruja-epic-banner ${isCrit ? "epic-crit" : "epic-fumble"}`;
    const titleText = isCrit ? "⚔️ ACERTO CRÍTICO!" : "💀 FALHA CRÍTICA!";

    banner.innerHTML = `
      ${img ? `<img class="epic-banner-portrait" src="${img}" alt="${name}" onerror="this.style.display='none'">` : ""}
      <div class="epic-banner-content">
        <div class="epic-banner-actor">${name}</div>
        <div class="epic-banner-title">${titleText}</div>
      </div>
    `;

    this.epicBannerEl = banner;
    this.container.appendChild(banner);

    this.epicBannerTimer = setTimeout(() => {
      if (this.epicBannerEl === banner) {
        banner.remove();
        this.epicBannerEl = null;
      }
      this.epicBannerTimer = null;
    }, 4500);
  }

  static showSpotlight({ src = "", title = "" } = {}) {
    if (!this.shouldRender() || !this.container || !src) return;

    if (this.spotlightTimer) clearTimeout(this.spotlightTimer);
    if (this.spotlightEl) this.spotlightEl.remove();

    const card = document.createElement("div");
    card.className = "koruja-spotlight-card";
    card.innerHTML = `
      <div class="spotlight-img-wrap">
        <img src="${src}" alt="${title}">
      </div>
      ${title ? `<div class="spotlight-caption">${title}</div>` : ""}
    `;

    this.spotlightEl = card;
    this.container.appendChild(card);

    this.spotlightTimer = setTimeout(() => {
      if (this.spotlightEl === card) {
        card.classList.add("closing");
        setTimeout(() => {
          if (this.spotlightEl === card) {
            card.remove();
            this.spotlightEl = null;
          }
        }, 400);
      }
      this.spotlightTimer = null;
    }, 10000);
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
    if (this.chatHistory.length > 5) this.chatHistory.shift();
    this.render();
  }
}

/* =========================================================
 * INICIALIZAÇÃO E HOOKS DO FOUNDRY VTT v14
 * ========================================================= */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "partyActorIds", { scope: "world", config: false, type: Array, default: [], onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "bossActorId", { scope: "world", config: false, type: String, default: "", onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "overlayMode", { scope: "world", config: false, type: String, default: "builtin-sanguis", onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "customOverlayImg", { scope: "world", config: false, type: String, default: "", onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showChatFeed", { scope: "world", config: false, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "showCombatBox", { scope: "world", config: false, type: Boolean, default: true, onChange: () => KorujaStreamHUD.render() });
  game.settings.register(MODULE_ID, "autoPanCombat", { scope: "world", config: true, name: "Câmera Automática no Combate", type: Boolean, default: true });
  game.settings.register(MODULE_ID, "cinematicHandouts", { scope: "world", config: true, name: "Vitrine Cinematográfica de Imagens/NPCs", type: Boolean, default: true });
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

  game.settings.registerMenu(MODULE_ID, "partyConfigMenu", {
    name: "Editor Visual da Live",
    label: "Abrir Editor de Overlay & Posições",
    hint: "Escolha os jogadores, Chefe, suba uma imagem de overlay e arraste os cards.",
    icon: "fa-solid fa-video",
    type: StreamPartyConfigApp,
    restricted: true
  });

  game.korujaStreamHud = {
    openConfig: () => new StreamPartyConfigApp().render({ force: true }),
    refresh: () => KorujaStreamHUD.render(),
    setBoss: (actorId) => game.settings.set(MODULE_ID, "bossActorId", actorId || "")
  };
});

Hooks.once("ready", () => KorujaStreamHUD.init());

Hooks.on("canvasReady", () => {
  if (!KorujaStreamHUD.shouldRender()) return;
  KorujaStreamHUD.render();
  setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
});

// Botão rápido na aba de Atores
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

// Botão de Coroa no Token HUD para marcar/desmarcar Chefe com 1 clique (usa Token UUID para suportar tokens não-vinculados)
Hooks.on("renderTokenHUD", (hud, html) => {
  if (!game.user?.isGM) return;
  const tokenDoc = hud.object?.document;
  const actorId = hud.object?.actor?.id;
  if (!tokenDoc || !actorId) return;

  const root = html instanceof HTMLElement ? html : html[0];
  const colRight = root?.querySelector(".col.right");
  if (!colRight || colRight.querySelector(".koruja-boss-toggle")) return;

  const currentBoss = game.settings.get(MODULE_ID, "bossActorId");
  const isBoss = currentBoss === tokenDoc.uuid || currentBoss === actorId;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `control-icon koruja-boss-toggle ${isBoss ? "active" : ""}`;
  btn.title = isBoss ? "Remover da Barra de Chefe da Live" : "Exibir na Barra de Chefe da Live";
  btn.innerHTML = `<i class="fa-solid fa-crown"></i>`;
  btn.addEventListener("click", async () => {
    const nextBoss = isBoss ? "" : tokenDoc.uuid;
    await game.settings.set(MODULE_ID, "bossActorId", nextBoss);
    ui.notifications.info(nextBoss ? `👑 ${hud.object.actor.name} exibido como Chefe na Live!` : "Barra de Chefe removida da Live.");
    hud.clear();
  });
  colRight.appendChild(btn);
});

// Intercepta ImagePopout ("Mostrar aos Jogadores") na tela da Live para Vitrine Cinematográfica
Hooks.on("renderImagePopout", (app, html) => {
  if (!KorujaStreamHUD.shouldRender() || !game.settings.get(MODULE_ID, "cinematicHandouts")) return;
  const el = html instanceof HTMLElement ? html : html[0];
  if (!el) return;

  const src = app.options?.src || app.document?.src || el.querySelector("img")?.src || "";
  const title = app.options?.window?.title || app.title || "";
  if (src) {
    el.style.display = "none";
    KorujaStreamHUD.showSpotlight({ src, title });
  }
});

Hooks.on("updateActor", (actor) => {
  const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
  const bossActorId = game.settings.get(MODULE_ID, "bossActorId");
  const isBossMatch = bossActorId && (actor.id === bossActorId || actor.parent?.uuid === bossActorId || actor.uuid === bossActorId);
  if (!actorIds.includes(actor.id) && !isBossMatch) return;

  const newHp = Number(actor.system?.attributes?.hp?.value ?? 0);
  const oldHp = KorujaStreamHUD.hpCache.get(actor.id);
  const flash = {};
  if (actorIds.includes(actor.id) && oldHp !== undefined) {
    if (newHp < oldHp) flash[actor.id] = "damage";
    else if (newHp > oldHp) flash[actor.id] = "heal";
  }
  KorujaStreamHUD.render(flash);
});

Hooks.on("updateToken", (tokenDoc) => {
  const bossActorId = game.settings.get(MODULE_ID, "bossActorId");
  if (!bossActorId) return;
  if (tokenDoc.uuid === bossActorId || tokenDoc.actorId === bossActorId) {
    KorujaStreamHUD.render();
  }
});

Hooks.on("createActiveEffect", (e) => { if (e.parent?.documentName === "Actor") KorujaStreamHUD.render(); });
Hooks.on("deleteActiveEffect", (e) => { if (e.parent?.documentName === "Actor") KorujaStreamHUD.render(); });
Hooks.on("updateActiveEffect", (e) => { if (e.parent?.documentName === "Actor") KorujaStreamHUD.render(); });

// Atualiza barra de combate + Câmera Diretora Automática (Auto-Pan)
Hooks.on("updateCombat", (combat, changed) => {
  KorujaStreamHUD.render();

  if (!KorujaStreamHUD.shouldRender() || !game.settings.get(MODULE_ID, "autoPanCombat")) return;
  if (!combat.started) return;
  if (changed.turn === undefined && changed.round === undefined && changed.active === undefined) return;

  const combatant = combat.combatant;
  const token = combatant?.token?.object;
  if (!token || combatant.hidden || token.document?.hidden) return;

  canvas.animatePan({
    x: token.center.x,
    y: token.center.y,
    duration: 1000
  });
});

Hooks.on("deleteCombat", () => KorujaStreamHUD.render());

Hooks.on("createChatMessage", (message) => {
  if (message.whisper?.length > 0 || message.blind) return;
  KorujaStreamHUD.pushChatMessage(message);

  if (message.rolls?.length > 0) {
    const roll = message.rolls[0];
    const actorId = message.speaker?.actor;
    const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    if (actorId && actorIds.includes(actorId)) {
      KorujaStreamHUD.showRollToast(actorId, roll);
    }

    const natResult = KorujaStreamHUD.detectCriticalOrFumble(roll);
    if (natResult) {
      const actor = actorId ? game.actors.get(actorId) : null;
      const name = message.speaker?.alias || actor?.name || message.author?.name || "Aventureiro";
      const img = actor?.img || message.author?.avatar || "";
      KorujaStreamHUD.showEpicBanner(natResult, { name, img });
    }
  }
});
