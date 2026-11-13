import catalogueJson from '../../../data/song_catalogue.json';
import { json } from '../../_shared/http';

const tracks = catalogueJson as Array<Record<string, any>>;

export function onRequestGet(): Response {
  const byLanguage: Record<string, { total: number; playable: number; metadataOnly: number }> = {};
  const byGenre: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let playableRecords = 0;
  for (const track of tracks) {
    const playable = track.isAuthorizedForGameplay === true && track.playbackStatus === 'verified_audio';
    if (playable) playableRecords += 1;
    const language = track.language || 'Unassigned';
    byLanguage[language] ||= { total: 0, playable: 0, metadataOnly: 0 };
    byLanguage[language].total += 1;
    byLanguage[language][playable ? 'playable' : 'metadataOnly'] += 1;
    const genre = track.genre || 'General';
    byGenre[genre] = (byGenre[genre] || 0) + 1;
    const source = track.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }
  return json({
    totalUniqueRecords: tracks.length,
    playableRecords,
    metadataOnlyRecords: tracks.length - playableRecords,
    byLanguage, byGenre, bySource,
    lastUpdated: tracks.reduce((latest, track) => {
      const candidate = Date.parse(String(track.importDate || ''));
      return Number.isFinite(candidate) && candidate > latest ? candidate : latest;
    }, 0) ? new Date(tracks.reduce((latest, track) => {
      const candidate = Date.parse(String(track.importDate || ''));
      return Number.isFinite(candidate) && candidate > latest ? candidate : latest;
    }, 0)).toISOString() : '',
    backupFileExists: false
  }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}
