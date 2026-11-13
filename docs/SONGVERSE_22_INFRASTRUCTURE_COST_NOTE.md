# SongVerse 2.2 Infrastructure Cost and Architecture Note

Reviewed 2026-11-13 from public vendor pricing pages. The Cloudflare and Supabase account plans, usage history, and billing settings for SongVerse were not accessed.

## Current pricing facts

- Cloudflare SQLite-backed Durable Objects are available on Workers Free and Paid. Free includes 100,000 Durable Object requests/day, 13,000 GB-s/day, 5 million SQLite row reads/day, 100,000 row writes/day, and 5 GB total SQLite storage. Exceeding a Free allowance causes that operation to fail; it does not automatically become paid usage. Incoming Durable Object WebSocket messages are billed at 1/20 of a request, outbound messages are not billed as requests, and WebSocket hibernation reduces duration charges. [Cloudflare Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- Workers Paid has a $5/month account minimum. Durable Objects include 1 million requests/month and 400,000 GB-s/month, then charge $0.15 per million requests and $12.50 per million GB-s. SQLite includes 25 billion row reads/month, 50 million row writes/month, and 5 GB-month before listed overage rates. [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- Supabase Free currently includes a 500 MB database, 50,000 monthly active users, 200 concurrent Realtime connections, and 2 million Realtime messages/month. Free projects pause after one week of inactivity. [Supabase pricing](https://supabase.com/pricing), [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)

## Workload estimate

The current frontend polls room state every three seconds and sends a heartbeat every 15 seconds. At 100 concurrent players over four active hours/day, that is about 480,000 polls plus 96,000 heartbeat requests/day. Forwarding that behavior to a Durable Object would exceed the 100,000/day Free request allowance.

The proposed design uses a hibernatable WebSocket per connected player, with authoritative mutations and alarms handled by one SQLite-backed Durable Object per room. For a conservative planning scenario of 100 room matches/day, 20 players per room, 15 minutes per match, one heartbeat per player every 15 seconds, about five guess/action events per player, and five timer alarms, approximate Durable Object billed requests are:

`100 × (20 connections + 1,200 incoming heartbeats / 20 + 100 action messages / 20 + 5 alarms) ≈ 9,000 requests/day`

At 10 ms of active handler time per incoming message, plus modest fan-out work, estimated active duration is well below 13,000 GB-s/day when WebSocket hibernation is used. At roughly 150 durable row writes per room, the scenario is about 15,000 writes/day. These are sizing estimates, not measured usage; production concurrency and message volume are unknown. The existing 3-second polling must not remain as the production sync path.

## Recommendation and cost guard

Use Durable Objects with SQLite as the multiplayer authority because one room can serialize membership, score, duplicate-event checks, alarms, and reconnect state. Keep persistent account and match-history records in Supabase. Do not use Supabase Realtime as the source of truth for scoring; its Free tier can still support auth and low-volume record persistence if the existing project is within quota.

This recommendation does **not** authorize deployment or activation. The account plan is unknown. Before any binding is deployed or live traffic is routed, verify the current Cloudflare plan and usage. If the account is Paid, any paid usage or overage could incur charges; obtain explicit approval first. If the account is Free, requests above the published limits fail closed and can interrupt rooms. No live Durable Object has been created or invoked as part of this review.
