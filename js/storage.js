const WATCHLIST_KEY = 'watchlist.items.v1';
const API_KEY_KEY = 'watchlist.tmdbToken.v1';

export function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_KEY) || '';
  } catch {
    return '';
  }
}

export function setApiKey(token) {
  try {
    localStorage.setItem(API_KEY_KEY, token);
  } catch {
    // storage unavailable (private mode, quota) — key just won't persist
  }
}

export function getWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable — changes stay in memory for this session only
  }
}

export function entryKey(mediaType, tmdbId) {
  return `${mediaType}-${tmdbId}`;
}

export function hasEntry(mediaType, tmdbId) {
  const key = entryKey(mediaType, tmdbId);
  return getWatchlist().some((item) => item.key === key);
}

export function addEntry(entry) {
  const items = getWatchlist();
  const key = entryKey(entry.mediaType, entry.tmdbId);
  if (items.some((item) => item.key === key)) return items;
  const next = [{ ...entry, key, addedAt: Date.now() }, ...items];
  saveWatchlist(next);
  return next;
}

export function removeEntry(key) {
  const next = getWatchlist().filter((item) => item.key !== key);
  saveWatchlist(next);
  return next;
}

export function restoreEntry(entry) {
  const items = getWatchlist();
  if (items.some((item) => item.key === entry.key)) return items;
  const next = [entry, ...items].sort((a, b) => b.addedAt - a.addedAt);
  saveWatchlist(next);
  return next;
}
