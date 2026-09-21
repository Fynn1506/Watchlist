import { searchTitles, fetchDetails, TmdbError } from './tmdb.js';
import {
  getApiKey, setApiKey, getWatchlist, addEntry, removeEntry, restoreEntry, hasEntry,
} from './storage.js';
import { renderResultRow, renderCard } from './ui.js';

const searchInput = document.getElementById('searchInput');
const searchSpinner = document.getElementById('searchSpinner');
const resultsPanel = document.getElementById('resultsPanel');
const listContainer = document.getElementById('listContainer');
const emptyState = document.getElementById('emptyState');
const apiKeyNotice = document.getElementById('apiKeyNotice');
const filterBar = document.getElementById('filterBar');
const toast = document.getElementById('toast');

const settingsDialog = document.getElementById('settingsDialog');
const settingsBtn = document.getElementById('settingsBtn');
const apiKeyNoticeBtn = document.getElementById('apiKeyNoticeBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');

let currentFilter = 'all';
let searchDebounce = null;
let searchSeq = 0;
let toastTimer = null;

function renderList() {
  const hasKey = Boolean(getApiKey());
  const items = getWatchlist().filter(
    (item) => currentFilter === 'all' || item.mediaType === currentFilter,
  );

  listContainer.innerHTML = '';
  const anyAtAll = getWatchlist().length > 0;

  apiKeyNotice.hidden = hasKey || anyAtAll;
  emptyState.hidden = !hasKey || anyAtAll || items.length > 0;
  filterBar.hidden = !anyAtAll;

  if (items.length === 0) {
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const entry of items) {
    fragment.appendChild(renderCard(entry));
  }
  listContainer.appendChild(fragment);
}

function showToast(message, { actionLabel, onAction } = {}) {
  clearTimeout(toastTimer);
  toast.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      toast.hidden = true;
      onAction();
    });
    toast.appendChild(btn);
  }
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}

function closeResults() {
  resultsPanel.hidden = true;
  resultsPanel.innerHTML = '';
}

async function handleSearchInput() {
  const query = searchInput.value.trim();
  clearTimeout(searchDebounce);

  if (query.length < 2) {
    closeResults();
    searchSpinner.hidden = true;
    return;
  }

  if (!getApiKey()) {
    resultsPanel.hidden = false;
    resultsPanel.innerHTML = '<p class="result-error">Bitte zuerst deinen TMDb-Key in den Einstellungen hinterlegen.</p>';
    return;
  }

  searchDebounce = setTimeout(() => runSearch(query), 380);
}

async function runSearch(query) {
  const seq = ++searchSeq;
  searchSpinner.hidden = false;
  try {
    const results = await searchTitles(query);
    if (seq !== searchSeq) return;
    resultsPanel.innerHTML = '';
    resultsPanel.hidden = false;

    if (results.length === 0) {
      resultsPanel.innerHTML = '<p class="result-empty">Keine Treffer gefunden.</p>';
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const result of results) {
      const row = renderResultRow(result);
      row.addEventListener('click', () => handlePick(result.media_type, result.id));
      fragment.appendChild(row);
    }
    resultsPanel.appendChild(fragment);
  } catch (err) {
    if (seq !== searchSeq) return;
    resultsPanel.hidden = false;
    resultsPanel.innerHTML = `<p class="result-error">${errMessage(err)}</p>`;
  } finally {
    if (seq === searchSeq) searchSpinner.hidden = true;
  }
}

function errMessage(err) {
  if (err instanceof TmdbError) {
    if (err.code === 'missing-key') return 'Bitte zuerst deinen TMDb-Key in den Einstellungen hinterlegen.';
    if (err.code === 'unauthorized') return 'TMDb-Key ungültig. Bitte in den Einstellungen prüfen.';
    if (err.code === 'network') return 'Netzwerkfehler – prüfe deine Verbindung.';
  }
  return 'Etwas ist schiefgelaufen. Bitte erneut versuchen.';
}

async function handlePick(mediaType, id) {
  if (hasEntry(mediaType, id)) {
    showToast('Bereits in deiner Watchlist.');
    searchInput.value = '';
    closeResults();
    return;
  }
  resultsPanel.innerHTML = '<p class="result-empty">Wird hinzugefügt …</p>';
  try {
    const details = await fetchDetails(mediaType, id);
    addEntry(details);
    searchInput.value = '';
    closeResults();
    renderList();
    showToast(`„${details.title}“ hinzugefügt.`);
  } catch (err) {
    resultsPanel.innerHTML = `<p class="result-error">${errMessage(err)}</p>`;
  }
}

function handleDelete(key) {
  const items = getWatchlist();
  const entry = items.find((item) => item.key === key);
  if (!entry) return;

  const card = listContainer.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (card) card.classList.add('is-removing');

  removeEntry(key);
  setTimeout(renderList, card ? 200 : 0);

  showToast(`„${entry.title}“ entfernt.`, {
    actionLabel: 'Rückgängig',
    onAction: () => {
      restoreEntry(entry);
      renderList();
    },
  });
}

function openSettings() {
  apiKeyInput.value = getApiKey();
  apiKeyStatus.textContent = '';
  apiKeyStatus.className = 'field-status';
  settingsDialog.showModal();
}

function saveApiKey() {
  const value = apiKeyInput.value.trim();
  setApiKey(value);
  apiKeyStatus.textContent = value ? 'Gespeichert.' : 'Key entfernt.';
  apiKeyStatus.className = 'field-status ok';
  renderList();
}

// ---- events ----
searchInput.addEventListener('input', handleSearchInput);
searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim().length >= 2 && resultsPanel.innerHTML) {
    resultsPanel.hidden = false;
  }
});
document.addEventListener('click', (e) => {
  if (!resultsPanel.hidden && !e.target.closest('.search-wrap') && !e.target.closest('.results-panel')) {
    closeResults();
  }
});

listContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="delete"]');
  if (!btn) return;
  const card = btn.closest('.card');
  handleDelete(card.dataset.key);
});

filterBar.addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  for (const el of filterBar.querySelectorAll('.filter-chip')) {
    el.classList.toggle('is-active', el === chip);
    el.setAttribute('aria-selected', String(el === chip));
  }
  renderList();
});

settingsBtn.addEventListener('click', openSettings);
apiKeyNoticeBtn.addEventListener('click', openSettings);
saveApiKeyBtn.addEventListener('click', saveApiKey);

// ---- init ----
renderList();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
