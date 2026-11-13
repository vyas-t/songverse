import { json } from '../_shared/http';

export const onRequestGet = (): Response => json({
  status: 'ok',
  service: 'SongVerse API',
  time: new Date().toISOString()
}, 200, { 'Cache-Control': 'no-store' });
