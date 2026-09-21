import { posterUrl, profileUrl, stillUrl } from './tmdb.js';

const filmIconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="M7 4.5v15M17 4.5v15M2.5 9.5h4.5M2.5 14.5h4.5M17 9.5h4.5M17 14.5h4.5"/></svg>`;

const trashIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/></svg>`;

export function formatRuntime(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
}

export function formatMeta(entry) {
  const parts = [];
  if (entry.year) parts.push(entry.year);
  if (entry.mediaType === 'movie') {
    if (entry.runtimeMinutes) {
      parts.push(formatRuntime(entry.runtimeMinutes));
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
  card.dataset.mediaType = entry.mediaType;
  card.dataset.tmdbId = entry.tmdbId;

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

function renderCastRow(cast) {
  if (!cast || cast.length === 0) return '';
  const people = cast
    .map((c) => {
      const photo = profileUrl(c.profilePath, 'w185');
      return `
        <div class="cast-card">
          ${photo
            ? `<img class="cast-photo" src="${photo}" alt="" loading="lazy">`
            : `<div class="cast-photo cast-photo--placeholder">${personIconSvg}</div>`}
          <div class="cast-name">${escapeHtml(c.name)}</div>
          ${c.character ? `<div class="cast-role">${escapeHtml(c.character)}</div>` : ''}
        </div>
      `;
    })
    .join('');
  return `
    <h3 class="detail-section-title">Besetzung</h3>
    <div class="cast-scroller">${people}</div>
  `;
}

export function renderDetailContent(entry, full) {
  const isMovie = entry.mediaType === 'movie';
  const poster = posterUrl(entry.posterPath, 'w342');
  const rating = full.voteAverage ? full.voteAverage.toFixed(1) : null;
  const dateLabel = isMovie
    ? formatDate(full.releaseDate)
    : formatDate(full.firstAirDate);

  const metaLine = [
    dateLabel,
    isMovie ? formatRuntime(full.runtimeMinutes) : null,
    isMovie && full.director ? `Regie: ${full.director}` : null,
  ].filter(Boolean);

  const seasonsBlock = isMovie ? '' : `
    <h3 class="detail-section-title">Staffeln</h3>
    <div id="seasonRow" class="season-row"></div>
    <div id="episodesContainer" class="episodes-container"></div>
  `;

  return `
    <div class="detail-poster-row">
      ${poster
        ? `<img class="detail-poster" src="${poster}" alt="" loading="lazy">`
        : `<div class="detail-poster card-poster--placeholder">${filmIconSvg}</div>`}
      <div class="detail-title-block">
        <span class="badge ${isMovie ? 'badge--movie' : 'badge--tv'}">${isMovie ? 'Film' : 'Serie'}</span>
        <h2 class="detail-title">${escapeHtml(entry.title)}</h2>
        ${full.tagline ? `<p class="detail-tagline">„${escapeHtml(full.tagline)}“</p>` : ''}
        ${rating ? `<div class="detail-rating">★ ${rating} <span class="detail-rating-max">/ 10</span></div>` : ''}
      </div>
    </div>

    ${metaLine.length ? `<p class="detail-meta-line">${metaLine.map(escapeHtml).join(' · ')}</p>` : ''}
    ${full.genres?.length ? `<div class="genre-row">${full.genres.map((g) => `<span class="genre-chip">${escapeHtml(g)}</span>`).join('')}</div>` : ''}

    ${entry.overview ? `<p class="detail-overview">${escapeHtml(entry.overview)}</p>` : ''}

    ${renderCastRow(full.cast)}
    ${seasonsBlock}
  `;
}

export function renderSeasonChips(seasons, activeSeason) {
  return seasons
    .map((s) => {
      const label = s.seasonNumber === 0 ? 'Specials' : `Staffel ${s.seasonNumber}`;
      const active = s.seasonNumber === activeSeason ? ' is-active' : '';
      return `<button type="button" class="filter-chip season-chip${active}" data-season="${s.seasonNumber}">${label}</button>`;
    })
    .join('');
}

export function renderEpisodes(episodes) {
  if (!episodes || episodes.length === 0) {
    return '<p class="result-empty">Keine Folgeninfos verfügbar.</p>';
  }
  return episodes
    .map((e) => {
      const still = stillUrl(e.stillPath, 'w300');
      const metaParts = [
        `Folge ${e.episodeNumber}`,
        formatDate(e.airDate),
        formatRuntime(e.runtime),
      ].filter(Boolean);
      return `
        <div class="episode-row">
          ${still
            ? `<img class="episode-still" src="${still}" alt="" loading="lazy">`
            : `<div class="episode-still episode-still--placeholder">${filmIconSvg}</div>`}
          <div class="episode-body">
            <div class="episode-title">${escapeHtml(e.name || `Folge ${e.episodeNumber}`)}</div>
            <div class="episode-meta">${metaParts.map(escapeHtml).join(' · ')}</div>
            ${e.overview ? `<p class="episode-overview">${escapeHtml(e.overview)}</p>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
}

const personIconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`;

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
