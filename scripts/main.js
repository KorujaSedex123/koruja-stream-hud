const MODULE_ID = "koruja-stream-hud";

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
 * Janela de configuração rápida (ApplicationV2 nativa do Foundry v14).
 */
class StreamPartyConfigApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "koruja-stream-hud-config",
    tag: "form",
    window: {
      title: "Koruja Stream HUD — Jogadores da Live",
      icon: "fa-solid fa-video",
      resizable: true
    },
    position: {
      width: 480,
      height: "auto"
    },
    form: {
      handler: StreamPartyConfigApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  async _prepareContext() {
    const selectedIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    const layoutMode = game.settings.get(MODULE_ID, "layoutMode") || "overlay-sanguis";
    const previewMode = game.settings.get(MODULE_ID, "previewInGM") || false;

    // Lista todos os atores do tipo character
    const characters = game.actors
      .filter(a => a.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      characters,
      selectedIds,
      layoutMode,
      previewMode
    };
  }

  async _renderHTML(context) {
    const container = document.createElement("div");
    container.classList.add("koruja-hud-config-body");

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
          <input type="number" class="koruja-order-input" name="order_${actor.id}" value="${order}" min="1" max="8" placeholder="#">
        </label>
      `;
    }).join("");

    const streamUrl = `${window.location.origin}/?streamhud=1`;

    container.innerHTML = `
      <p class="notes">Selecione os personagens que aparecerão na transmissão e defina a ordem (1 a 4).</p>
      <div class="koruja-config-list">
        ${charRows || "<p class='notes'>Nenhum personagem (Character) encontrado no mundo.</p>"}
      </div>

      <div class="form-group">
        <label>Posição / Layout na Tela (1920x1080)</label>
        <select name="layoutMode">
          <option value="overlay-sanguis" ${context.layoutMode === "overlay-sanguis" ? "selected" : ""}>Alinhado às Câmeras (Overlay Sanguis et Thus)</option>
          <option value="bar-bottom" ${context.layoutMode === "bar-bottom" ? "selected" : ""}>Barra Inferior Centralizada</option>
          <option value="bar-top" ${context.layoutMode === "bar-top" ? "selected" : ""}>Barra Superior Centralizada</option>
          <option value="sidebar-left" ${context.layoutMode === "sidebar-left" ? "selected" : ""}>Lista Vertical à Esquerda</option>
        </select>
      </div>

      <div class="form-group">
        <label>Pré-visualizar HUD na minha tela de Mestre</label>
        <input type="checkbox" name="previewInGM" ${context.previewMode ? "checked" : ""}>
      </div>

      <div class="koruja-url-box">
        <label><i class="fa-solid fa-link"></i> URL para o OBS (Fonte de Navegador 1920x1080):</label>
        <input type="text" readonly value="${streamUrl}" onclick="this.select(); navigator.clipboard.writeText(this.value); ui.notifications.info('URL copiada!');">
      </div>

      <footer class="sheet-footer flexrow">
        <button type="submit" class="koruja-save-btn">
          <i class="fa-solid fa-floppy-disk"></i> Salvar Configuração
        </button>
      </footer>
    `;
    return container;
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

    await game.settings.set(MODULE_ID, "partyActorIds", orderedIds);
    await game.settings.set(MODULE_ID, "layoutMode", data.layoutMode || "overlay-sanguis");
    await game.settings.set(MODULE_ID, "previewInGM", Boolean(data.previewInGM));

    ui.notifications.info(`Stream HUD atualizado (${orderedIds.length} jogadores selecionados).`);
    KorujaStreamHUD.render();
  }
}

/**
 * Controlador principal da Overlay Transparente.
 */
class KorujaStreamHUD {
  static container = null;
  static hpCache = new Map();
  static rollTimers = new Map();

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

  static render(flashEvents = {}) {
    if (!this.shouldRender()) {
      this.destroy();
      return;
    }
    if (!this.container) this.init();

    const layoutMode = game.settings.get(MODULE_ID, "layoutMode") || "overlay-sanguis";
    const showHP = game.settings.get(MODULE_ID, "showHP");
    const showAC = game.settings.get(MODULE_ID, "showAC");
    const showConditions = game.settings.get(MODULE_ID, "showConditions");

    this.container.className = `layout-${layoutMode}`;

    const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
    const actors = actorIds.map(id => game.actors.get(id)).filter(Boolean);

    if (actors.length === 0) {
      this.container.innerHTML = game.user?.isGM
        ? `<div class="koruja-hud-empty">Nenhum jogador configurado no Stream HUD.</div>`
        : "";
      return;
    }

    const activeCombatantActorId = game.combat?.started ? game.combat.combatant?.actor?.id : null;

    this.container.innerHTML = actors.map((actor, index) => {
      const hp = actor.system?.attributes?.hp || { value: 0, max: 1, temp: 0 };
      const hpMax = Math.max(1, Number(hp.max) || 1);
      const hpVal = Math.max(0, Number(hp.value) || 0);
      const hpTemp = Math.max(0, Number(hp.temp) || 0);
      const hpPct = Math.min(100, Math.round((hpVal / hpMax) * 100));
      const ac = actor.system?.attributes?.ac?.value ?? 10;
      const level = actor.system?.details?.level ?? 1;

      // Atualiza cache de HP para animações futuras
      this.hpCache.set(actor.id, hpVal);

      const isTurn = activeCombatantActorId === actor.id;
      const isDown = hpVal === 0;
      const isBloodied = hpPct > 0 && hpPct <= 50;
      const flashClass = flashEvents[actor.id] ? `flash-${flashEvents[actor.id]}` : "";

      // Condições ativas
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

      // Barra de HP colorida dinamicamente
      const barColorClass = hpPct <= 25 ? "hp-critical" : hpPct <= 50 ? "hp-bloodied" : "hp-healthy";

      return `
        <div class="koruja-player-card slot-${index + 1} ${isTurn ? "is-active-turn" : ""} ${isDown ? "is-down" : ""} ${flashClass}" data-actor-id="${actor.id}">
          <div class="koruja-roll-toast" id="koruja-roll-${actor.id}"></div>
          <div class="koruja-card-inner">
            <div class="koruja-portrait-wrap">
              <img class="koruja-portrait ${isBloodied ? "bloodied" : ""}" src="${actor.img}" alt="${actor.name}">
              ${isTurn ? `<div class="koruja-turn-badge">TURNO</div>` : ""}
              ${showAC ? `
                <div class="koruja-ac-badge" title="Classe de Armadura">
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
                  <div class="koruja-hp-text">
                    ${hpVal} / ${hpMax}${hpTemp > 0 ? ` <span class="hp-temp">(+${hpTemp})</span>` : ""}
                  </div>
                </div>
              ` : ""}

              ${conditionsHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  static showRollToast(actorId, roll) {
    if (!this.shouldRender() || !game.settings.get(MODULE_ID, "showRolls")) return;
    const toastEl = document.getElementById(`koruja-roll-${actorId}`);
    if (!toastEl) return;

    const total = roll.total;
    const formula = roll.formula || "";
    const isCrit = roll.isCritical;
    const isFumble = roll.isFumble;

    let badgeClass = "";
    let tag = "";
    if (isCrit) {
      badgeClass = "roll-crit";
      tag = "CRÍTICO!";
    } else if (isFumble) {
      badgeClass = "roll-fumble";
      tag = "FALHA CRÍTICA";
    }

    toastEl.className = `koruja-roll-toast visible ${badgeClass}`;
    toastEl.innerHTML = `
      <span class="roll-icon">🎲</span>
      <span class="roll-total">${total}</span>
      ${tag ? `<span class="roll-tag">${tag}</span>` : `<span class="roll-formula">${formula}</span>`}
    `;

    if (this.rollTimers.has(actorId)) {
      clearTimeout(this.rollTimers.get(actorId));
    }
    const timer = setTimeout(() => {
      const el = document.getElementById(`koruja-roll-${actorId}`);
      if (el) el.classList.remove("visible");
    }, 6000);
    this.rollTimers.set(actorId, timer);
  }
}

/* =========================================================
 * INICIALIZAÇÃO E HOOKS DO FOUNDRY VTT v14
 * ========================================================= */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "partyActorIds", {
    name: "IDs dos Jogadores na Live",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => KorujaStreamHUD.render()
  });

  game.settings.register(MODULE_ID, "layoutMode", {
    name: "Layout da Overlay",
    scope: "world",
    config: false,
    type: String,
    default: "overlay-sanguis",
    onChange: () => KorujaStreamHUD.render()
  });

  game.settings.register(MODULE_ID, "streamUser", {
    name: "Nome do Usuário da Transmissão (OBS)",
    hint: "Qualquer cliente conectado com este nome de usuário (ou usando ?streamhud=1 na URL) ativa a overlay transparente automaticamente.",
    scope: "world",
    config: true,
    type: String,
    default: "Stream",
    onChange: () => KorujaStreamHUD.init()
  });

  game.settings.register(MODULE_ID, "hideFoundryUI", {
    name: "Ocultar Interface do Foundry no Modo Stream",
    hint: "Remove barras laterais, mapa e deixa o fundo 100% transparente no usuário Stream para captura limpa no OBS.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => KorujaStreamHUD.init()
  });

  game.settings.register(MODULE_ID, "showHP", {
    name: "Exibir Barra de Vida (PV)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => KorujaStreamHUD.render()
  });

  game.settings.register(MODULE_ID, "showAC", {
    name: "Exibir Classe de Armadura (CA)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => KorujaStreamHUD.render()
  });

  game.settings.register(MODULE_ID, "showConditions", {
    name: "Exibir Ícones de Condições",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => KorujaStreamHUD.render()
  });

  game.settings.register(MODULE_ID, "showRolls", {
    name: "Exibir Última Rolagem de Dados",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "previewInGM", {
    name: "Pré-visualizar Overlay na tela do Mestre",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => KorujaStreamHUD.init()
  });

  game.settings.registerMenu(MODULE_ID, "partyConfigMenu", {
    name: "Configurar Jogadores da Live",
    label: "Selecionar Jogadores e Layout",
    hint: "Escolha quais personagens aparecem na overlay do OBS e copie o link pronto.",
    icon: "fa-solid fa-video",
    type: StreamPartyConfigApp,
    restricted: true
  });

  game.korujaStreamHud = {
    openConfig: () => new StreamPartyConfigApp().render({ force: true }),
    refresh: () => KorujaStreamHUD.render()
  };
});

Hooks.once("ready", () => {
  KorujaStreamHUD.init();
});

// Botão rápido no topo da aba de Atores (para o Mestre)
Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user?.isGM) return;
  const headerActions = html.querySelector?.(".header-actions") || html[0]?.querySelector(".header-actions");
  if (!headerActions || headerActions.querySelector(".koruja-stream-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "koruja-stream-btn";
  btn.innerHTML = `<i class="fa-solid fa-video"></i> Stream HUD`;
  btn.title = "Configurar Jogadores na Overlay da Live";
  btn.addEventListener("click", () => game.korujaStreamHud.openConfig());
  headerActions.appendChild(btn);
});

// Atualização em tempo real de HP / CA
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

// Condições (ActiveEffects)
Hooks.on("createActiveEffect", (effect) => {
  if (effect.parent?.documentName === "Actor") KorujaStreamHUD.render();
});
Hooks.on("deleteActiveEffect", (effect) => {
  if (effect.parent?.documentName === "Actor") KorujaStreamHUD.render();
});
Hooks.on("updateActiveEffect", (effect) => {
  if (effect.parent?.documentName === "Actor") KorujaStreamHUD.render();
});

// Combate / Turno ativo
Hooks.on("updateCombat", () => KorujaStreamHUD.render());
Hooks.on("deleteCombat", () => KorujaStreamHUD.render());

// Rolagens de Dados Públicas (nunca vaza sussurros do Mestre!)
Hooks.on("createChatMessage", (message) => {
  if (message.whisper?.length > 0 || message.blind) return;
  if (!message.rolls?.length) return;
  const actorId = message.speaker?.actor;
  const actorIds = game.settings.get(MODULE_ID, "partyActorIds") || [];
  if (!actorId || !actorIds.includes(actorId)) return;

  KorujaStreamHUD.showRollToast(actorId, message.rolls[0]);
});
