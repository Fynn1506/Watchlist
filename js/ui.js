import { posterUrl } from './tmdb.js';

const filmIconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="M7 4.5v15M17 4.5v15M2.5 9.5h4.5M2.5 14.5h4.5M17 9.5h4.5M17 14.5h4.5"/></svg>`;

const trashIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/></svg>`;

export function formatMeta(entry) {
  const parts = [];
  if (entry.year) parts.push(entry.year);
  if (entry.mediaType === 'movie') {
    if (entry.runtimeMinutes) {
      const h = Math.floor(entry.runtimeMinutes / 60);
      const m = entry.runtimeMinutes % 60;
      parts.push(h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`);
    }
  } else {
    if (entry.numberOfSeasons) {
      parts.push(`${entry.numberOfSeasons} Staffel${entry.numberOfSeasons === 1 ? '' : 'n'}`);
    }
    if (entry.numberOfEpisodes) {
      parts.push(`${entry.numberOfEpisodes} Folgen`);
    }
  }
  return parts;
}

export function renderResultRow(result) {
  const isMovie = result.media_type === 'movie';
  const title = isMovie ? result.title : result.name;
  const date = isMovie ? result.release_date : result.first_air_date;
  const year = date ? date.slice(0, 4) : '';
  const poster = posterUrl(result.poster_path, 'w92');

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'result-row';
  row.setAttribute('role', 'option');
  row.dataset.mediaType = result.media_type;
  row.dataset.id = result.id;

  row.innerHTML = `
    ${poster
      ? `<img class="result-thumb" src="${poster}" alt="" loading="lazy">`
      : `<div class="result-thumb result-thumb--placeholder">${filmIconSvg}</div>`}
    <div class="result-info">
      <div class="result-title">${escapeHtml(title || 'Ohne Titel')}</div>
      <div class="result-meta">
        <span class="badge ${isMovie ? 'badge--movie' : 'badge--tv'}">${isMovie ? 'Film' : 'Serie'}</span>
        ${year ? `<span>${year}</span>` : ''}
      </div>
    </div>
  `;
  return row;
}

export function renderCard(entry) {
  const poster = posterUrl(entry.posterPath, 'w185');
  const metaParts = formatMeta(entry);
  const isMovie = entry.mediaType === 'movie';

  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.key = entry.key;

  card.innerHTML = `
    ${poster
      ? `<img class="card-poster" src="${poster}" alt="" loading="lazy">`
      : `<div class="card-poster card-poster--placeholder">${filmIconSvg}</div>`}
    <div class="card-body">
      <div class="card-top">
        <h3 class="card-title">${escapeHtml(entry.title)}</h3>
        <button class="delete-btn" aria-label="Aus Watchlist entfernen" data-action="delete">${trashIconSvg}</button>
      </div>
      <div class="card-meta">
        <span class="badge ${isMovie ? 'badge--movie' : 'badge--tv'}">${isMovie ? 'Film' : 'Serie'}</span>
        ${metaParts.map((p) => `<span>${escapeHtml(p)}</span>`).join('')}
      </div>
      ${entry.overview ? `<p class="card-desc">${escapeHtml(entry.overview)}</p>` : ''}
    </div>
  `;
  return card;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
