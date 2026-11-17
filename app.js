(() => {
  "use strict";

  const INITIAL_WAIT_SECONDS = 30;
  const EXTRA_WAIT_PER_REVEAL_SECONDS = 1;
  const LETTERS = "ABCDEFGHIJKLMNOPRSTUV".split("");

  const CATEGORIES = [
    { key: "Verbs", label: "Verbs", translation: "Verbos" },
    { key: "Adjectives", label: "Adjectives", translation: "Adjetivos" },
    { key: "Animals", label: "Animals", translation: "Animais" },
    { key: "Food", label: "Food", translation: "Comidas" },
    { key: "Colors", label: "Colors", translation: "Cores" },
    { key: "Sports", label: "Sports", translation: "Esportes" },
    { key: "Professions", label: "Professions", translation: "Profissões" },
    { key: "Body Parts", label: "Body Parts", translation: "Partes do corpo" },
    { key: "School Objects", label: "School Objects", translation: "Objetos escolares" },
    { key: "Clothes", label: "Clothes", translation: "Roupas" },
    { key: "Objects", label: "Objects", translation: "Objetos" },
    { key: "Movies-TV", label: "Movies / TV", translation: "Filmes e séries" }
  ];

  const content = document.getElementById("app-content");
  const statusPill = document.getElementById("status-pill");
  const changeLetterTop = document.getElementById("change-letter-top");
  const footerDetail = document.getElementById("footer-detail");

  let unlocked = false;
  let selectedLetter = null;
  let selectedCategory = null;
  let completedReveals = 0;
  let unlockInterval = null;
  let revealTimeout = null;
  let revealInterval = null;
  let activeRequestId = 0;

  const wordsByCategoryAndLetter = buildIndex(window.STOP_WORDS || []);

  function buildIndex(rows) {
    const index = Object.create(null);
    for (const row of rows) {
      if (!row || !row.category || !row.letter || !row.word) continue;
      if (!index[row.category]) index[row.category] = Object.create(null);
      if (!index[row.category][row.letter]) index[row.category][row.letter] = [];
      index[row.category][row.letter].push(row);
    }
    return index;
  }

  function setStatus(label, ready = false) {
    statusPill.textContent = label;
    statusPill.classList.toggle("ready", ready);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function cancelPendingReveal() {
    activeRequestId += 1;
    if (revealTimeout !== null) clearTimeout(revealTimeout);
    if (revealInterval !== null) clearInterval(revealInterval);
    revealTimeout = null;
    revealInterval = null;
  }

  function startInitialCountdown() {
    const startedAt = Date.now();
    const unlockAt = startedAt + INITIAL_WAIT_SECONDS * 1000;
    const count = document.getElementById("lock-count");
    const message = document.getElementById("lock-message");
    const detail = document.getElementById("lock-detail");
    const ring = document.getElementById("timer-ring");

    function update() {
      const millisecondsLeft = Math.max(0, unlockAt - Date.now());
      const secondsLeft = Math.ceil(millisecondsLeft / 1000);
      const elapsedRatio = 1 - millisecondsLeft / (INITIAL_WAIT_SECONDS * 1000);
      count.textContent = String(secondsLeft);
      ring.style.setProperty("--progress", `${Math.min(1, Math.max(0, elapsedRatio)) * 360}deg`);
      detail.textContent = secondsLeft === 1
        ? "A página será liberada em 1 segundo."
        : `A página será liberada em ${secondsLeft} segundos.`;

      if (millisecondsLeft <= 0) {
        clearInterval(unlockInterval);
        unlocked = true;
        message.textContent = "Banco de palavras liberado";
        detail.textContent = "Escolha uma letra para começar.";
        setStatus("DISPONÍVEL", true);
        changeLetterTop.classList.remove("hidden");
        renderLetters();
      }
    }

    update();
    unlockInterval = setInterval(update, 200);
  }

  function renderLetters() {
    cancelPendingReveal();
    selectedLetter = null;
    selectedCategory = null;
    setStatus("ESCOLHA UMA LETRA", true);
    changeLetterTop.classList.add("hidden");

    content.innerHTML = `
      <section class="screen-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> ETAPA 01 · ALFABETO</div>
          <h1>Escolha uma <span>letra.</span></h1>
          <p>Selecione a letra sorteada no jogo para consultar as categorias disponíveis.</p>
        </div>
      </section>
      <section class="letter-grid" aria-label="Letras disponíveis">
        ${LETTERS.map((letter) => `
          <button class="letter-button" type="button" data-action="select-letter" data-letter="${letter}" aria-label="Selecionar letra ${letter}">${letter}</button>
        `).join("")}
      </section>
      <p class="letters-note">21 letras disponíveis. Q, W, X, Y e Z foram retiradas do banco.</p>
    `;
  }

  function renderCategories() {
    cancelPendingReveal();
    selectedCategory = null;
    setStatus(`LETRA ${selectedLetter}`, true);
    changeLetterTop.classList.remove("hidden");

    const categoryCards = CATEGORIES.map((category) => {
      const words = getWords(category.key, selectedLetter);
      return `
        <button class="category-card" type="button" data-action="select-category" data-category="${escapeHtml(category.key)}">
          <span class="category-top">
            <span>
              <span class="category-name">${escapeHtml(category.label)}</span>
              <span class="category-translation">${escapeHtml(category.translation)}</span>
            </span>
            <span class="category-count">${words.length}</span>
          </span>
          <span class="category-foot"><span>${words.length === 1 ? "1 palavra" : `${words.length} palavras`}</span><span class="category-arrow" aria-hidden="true">↗</span></span>
        </button>
      `;
    }).join("");

    content.innerHTML = `
      <section class="screen-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> ETAPA 02 · CATEGORIAS</div>
          <h1>Letra <span>${escapeHtml(selectedLetter)}.</span></h1>
          <p>Agora escolha uma categoria para revelar as palavras correspondentes.</p>
        </div>
        <div class="heading-actions">
          <button class="button button-quiet" type="button" data-action="show-letters">← Todas as letras</button>
        </div>
      </section>
      <section class="category-grid" aria-label="Categorias">${categoryCards}</section>
      <p class="session-note">Primeira revelação imediata. A cada categoria revelada, a próxima seleção acrescenta mais 1 segundo de espera. Revelações nesta sessão: ${completedReveals}.</p>
    `;
  }

  function getWords(categoryKey, letter) {
    return (wordsByCategoryAndLetter[categoryKey] && wordsByCategoryAndLetter[categoryKey][letter]) || [];
  }

  function beginCategoryReveal(categoryKey) {
    cancelPendingReveal();
    selectedCategory = categoryKey;
    const category = CATEGORIES.find((item) => item.key === categoryKey);
    const words = getWords(categoryKey, selectedLetter);
    const waitSeconds = completedReveals * EXTRA_WAIT_PER_REVEAL_SECONDS;

    if (waitSeconds <= 0) {
      completedReveals += 1;
      renderWords(category, words);
      return;
    }

    setStatus("PREPARANDO PALAVRAS", true);
    const requestId = activeRequestId;
    let remaining = waitSeconds;

    content.innerHTML = `
      <section class="screen-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> ETAPA 03 · REVELAÇÃO</div>
          <h1>Preparando <span>${escapeHtml(category.label)}.</span></h1>
          <p>Letra ${escapeHtml(selectedLetter)}. As palavras serão exibidas quando a contagem terminar.</p>
        </div>
        <div class="heading-actions">
          <button class="button button-quiet" type="button" data-action="show-letters">Trocar letra</button>
        </div>
      </section>
      <section class="wait-panel">
        <div class="wait-spinner" aria-hidden="true"></div>
        <h2>Aguarde <span class="wait-count" id="wait-count">${remaining}</span> s</h2>
        <p>Esta é a revelação número ${completedReveals + 1} desta sessão.<br>O tempo de espera aumenta em 1 segundo a cada revelação concluída.</p>
        <div class="wait-actions">
          <button class="button button-quiet" type="button" data-action="back-categories">Cancelar e voltar às categorias</button>
        </div>
      </section>
    `;

    revealInterval = setInterval(() => {
      if (requestId !== activeRequestId) return;
      remaining = Math.max(0, remaining - 1);
      const counter = document.getElementById("wait-count");
      if (counter) counter.textContent = String(remaining);
    }, 1000);

    revealTimeout = setTimeout(() => {
      if (requestId !== activeRequestId) return;
      clearInterval(revealInterval);
      revealInterval = null;
      revealTimeout = null;
      completedReveals += 1;
      renderWords(category, words);
    }, waitSeconds * 1000);
  }

  function renderWords(category, words) {
    cancelPendingReveal();
    setStatus(`LETRA ${selectedLetter} · ${category.label.toUpperCase()}`, true);
    changeLetterTop.classList.remove("hidden");

    const list = words.length
      ? words.map((item, index) => `
          <div class="word-item">
            <span class="word-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="word-text">
              <strong>${escapeHtml(item.word)}</strong>
              <span>${escapeHtml(item.meaning)}</span>
            </span>
          </div>
        `).join("")
      : `<div class="empty-state">Não há palavras cadastradas para esta combinação de letra e categoria.</div>`;

    content.innerHTML = `
      <section class="screen-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> ETAPA 03 · PALAVRAS</div>
          <h1><span>${escapeHtml(selectedLetter)}</span> · ${escapeHtml(category.label)}.</h1>
          <p>${escapeHtml(category.translation)}. Consulte as opções e escolha uma palavra para a rodada.</p>
        </div>
        <div class="heading-actions">
          <button class="button button-quiet" type="button" data-action="back-categories">← Categorias</button>
          <button class="button button-primary" type="button" data-action="show-letters">Trocar letra</button>
        </div>
      </section>
      <section class="words-panel">
        <div class="words-panel-head">
          <strong>${escapeHtml(category.label)} · LETRA ${escapeHtml(selectedLetter)}</strong>
          <span>${words.length} ${words.length === 1 ? "opção encontrada" : "opções encontradas"}</span>
        </div>
        <div class="word-list">${list}</div>
      </section>
      <p class="session-note">Revelações concluídas nesta sessão: ${completedReveals}. A próxima categoria selecionada aguardará mais ${EXTRA_WAIT_PER_REVEAL_SECONDS} segundos adicionais.</p>
    `;
  }

  content.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || !unlocked) return;

    const action = button.dataset.action;
    if (action === "select-letter") {
      selectedLetter = button.dataset.letter;
      renderCategories();
    } else if (action === "select-category") {
      beginCategoryReveal(button.dataset.category);
    } else if (action === "show-letters") {
      renderLetters();
    } else if (action === "back-categories") {
      renderCategories();
    }
  });

  changeLetterTop.addEventListener("click", () => {
    if (unlocked) renderLetters();
  });

  footerDetail.textContent = `${CATEGORIES.length} categorias · ${LETTERS.length} letras disponíveis`;
  startInitialCountdown();
})();
