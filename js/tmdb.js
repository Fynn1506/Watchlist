import { getApiKey } from './storage.js';

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

export const posterUrl = (path, size = 'w342') =>
  path ? `${IMG_BASE}/${size}${path}` : null;

class TmdbError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function tmdbFetch(path, params = {}) {
  const token = getApiKey();
  if (!token) throw new TmdbError('missing-key', 'missing-key');

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('language', 'de-DE');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch {
    throw new TmdbError('Netzwerkfehler – prüfe deine Verbindung.', 'network');
  }

  if (res.status === 401) throw new TmdbError('TMDb-Key ungültig.', 'unauthorized');
  if (!res.ok) throw new TmdbError(`TMDb-Fehler (${res.status}).`, 'http');

  return res.json();
}

export async function searchTitles(query) {
  const data = await tmdbFetch('/search/multi', {
    query,
    include_adult: 'false',
    page: '1',
  });
  return (data.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .filter((r) => r.poster_path || r.title || r.name)
    .slice(0, 8);
}

export async function fetchDetails(mediaType, id) {
  const data = await tmdbFetch(`/${mediaType}/${id}`);
  if (mediaType === 'movie') {
    return {
      mediaType: 'movie',
      tmdbId: id,
      title: data.title,
      overview: data.overview,
      posterPath: data.poster_path,
      year: (data.release_date || '').slice(0, 4),
      runtimeMinutes: data.runtime || null,
    };
  }
  return {
    mediaType: 'tv',
    tmdbId: id,
    title: data.name,
    overview: data.overview,
    posterPath: data.poster_path,
    year: (data.first_air_date || '').slice(0, 4),
    numberOfSeasons: data.number_of_seasons || null,
    numberOfEpisodes: data.number_of_episodes || null,
  };
}

export { TmdbError };
