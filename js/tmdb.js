import { getApiKey } from './storage.js';

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

export const posterUrl = (path, size = 'w342') =>
  path ? `${IMG_BASE}/${size}${path}` : null;

export const profileUrl = (path, size = 'w185') =>
  path ? `${IMG_BASE}/${size}${path}` : null;

export const stillUrl = (path, size = 'w300') =>
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

export async function fetchMovieFull(id) {
  const data = await tmdbFetch(`/movie/${id}`, { append_to_response: 'credits' });
  const director = (data.credits?.crew || []).find((c) => c.job === 'Director');
  return {
    genres: (data.genres || []).map((g) => g.name),
    tagline: data.tagline || '',
    voteAverage: data.vote_average || null,
    releaseDate: data.release_date || '',
    runtimeMinutes: data.runtime || null,
    director: director ? director.name : null,
    cast: (data.credits?.cast || []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
    })),
  };
}

export async function fetchTvFull(id) {
  const data = await tmdbFetch(`/tv/${id}`, { append_to_response: 'aggregate_credits' });
  return {
    genres: (data.genres || []).map((g) => g.name),
    tagline: data.tagline || '',
    voteAverage: data.vote_average || null,
    firstAirDate: data.first_air_date || '',
    seasons: (data.seasons || [])
      .filter((s) => s.episode_count > 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airDate: s.air_date || '',
      })),
    cast: (data.aggregate_credits?.cast || []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.roles?.[0]?.character || '',
      profilePath: c.profile_path,
    })),
  };
}

export async function fetchSeasonEpisodes(id, seasonNumber) {
  const data = await tmdbFetch(`/tv/${id}/season/${seasonNumber}`);
  return (data.episodes || []).map((e) => ({
    episodeNumber: e.episode_number,
    name: e.name,
    overview: e.overview || '',
    airDate: e.air_date || '',
    runtime: e.runtime || null,
    stillPath: e.still_path,
  }));
}

export { TmdbError };
