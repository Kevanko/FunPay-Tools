# FPT cloud sync — Cloudflare Worker + D1

Per-account settings sync for FunPay Tools. **Free tier only** — never subscribe
to Workers Paid; never add R2/KV. A card on the account does **not** cause charges
while you stay on the free plan and under free limits.

## What it stores
- Key: a random `syncId` (UUID-ish) generated per FunPay account on the client.
  The id *is* the capability — whoever holds it can read/write that one record.
- Value: `base64(gzip(JSON))` of the copyable settings subset only.
- **Never** golden_key / PHPSESSID / cookies. Those stay local.

## Free-tier safety
- D1 free: 5 GB storage, 100k row writes/day, 5M row reads/day. Our usage: a few
  reads + writes per active user per day (client debounces + skips unchanged).
- Worker rejects any bundle > 256 KB (`MAX_BYTES`) to cap storage growth.
- Workers free: 100k requests/day. One D1 read (+ maybe one write) per request.

## Deploy
```sh
cd cloud
npm i -g wrangler            # or: npx wrangler ...
wrangler login              # opens browser; you're logged in -> Allow
wrangler d1 create fpt-sync # prints database_id
# paste database_id into wrangler.toml
wrangler d1 execute fpt-sync --remote --file=./schema.sql
wrangler deploy             # prints https://fpt-sync.<subdomain>.workers.dev
```
Then put that URL into the extension's `CLOUD_ENDPOINT` constant and
`host_permissions` in both manifest.json copies.

## Smoke test
```sh
# write
curl -X PUT https://fpt-sync.<sub>.workers.dev/s/testid0001testid0001 \
  -H 'Content-Type: application/json' \
  -d '{"bundle":"H4sIAAAAAAAAA6tWUkpJLEnNUbJSqgUA... ","updated_at":1700000000000}'
# read
curl https://fpt-sync.<sub>.workers.dev/s/testid0001testid0001
```
