import catalogueJson from '../../../../data/song_catalogue.json';
import { authorizeAdmin } from '../../../_shared/admin';
import { json } from '../../../_shared/http';
import { SupabaseEnv } from '../../../_shared/supabase';

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-catalogue-stats');
  if (!auth.ok) return auth.response;
  const tracks = catalogueJson as Array<Record<string, any>>;
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
    byGenre[track.genre || 'General'] = (byGenre[track.genre || 'General'] || 0) + 1;
    bySource[track.source || 'unknown'] = (bySource[track.source || 'unknown'] || 0) + 1;
  }
  return json({ totalUniqueRecords: tracks.length, playableRecords, metadataOnlyRecords: tracks.length - playableRecords,
    byLanguage, byGenre, bySource, lastUpdated: '', backupFileExists: false });
}
