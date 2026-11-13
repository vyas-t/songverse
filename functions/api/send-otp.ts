/** Deprecated endpoint. Supabase Auth owns verification and recovery email delivery. */
export const onRequestPost = async (): Promise<Response> => new Response(JSON.stringify({
  error: 'This endpoint is disabled. Supabase Auth manages verification and recovery email codes.'
}), {
  status: 410,
  headers: { 'Content-Type': 'application/json; charset=utf-8' }
});
