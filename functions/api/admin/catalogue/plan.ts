import catalogueJson from '../../../../data/song_catalogue.json';
import { authorizeAdmin } from '../../../_shared/admin';
import { json } from '../../../_shared/http';
import { SupabaseEnv } from '../../../_shared/supabase';

export async function onRequestGet(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'admin-catalogue-plan');
  if (!auth.ok) return auth.response;
  const tracks = catalogueJson as Array<Record<string, any>>;
  const playable = tracks.filter(track => track.isAuthorizedForGameplay === true && track.playbackStatus === 'verified_audio').length;
  return json({
    planSummary: 'Proposed Catalogue Migration and Deletion Plan',
    safetyGuarantee: 'This Pages endpoint performs no catalogue or account mutations.',
    backupConfirmed: false,
    backupLocation: null,
    currentTracksTotal: tracks.length,
    playableTracksPreserved: playable,
    metadataOnlyTracks: tracks.length - playable,
    deletionProposed: 'Zero destructive deletions are performed by this endpoint.',
    importRecommendation: 'Import verified metadata only after a durable store and backup path are configured.'
  });
}
