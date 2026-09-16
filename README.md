# doxa-life (doxa-maps-cdn)

The team's shared Nuxt app and CDN host for the Doxa maps. Static drop-in map
builds live under `public/js/doxa-maps-build/`, and the app serves the Mapbox
token endpoint that those maps use at runtime.

## Maps & map tokens

The maps support two providers: **MapLibre** and **Mapbox**.

### MapLibre — no token required

MapLibre-based maps need **no API token**. The build sets `var TOKEN_FREE = true;`
and mounts the map with an empty token (`provider: 'maplibre'`, using
`window.maplibregl`), skipping the token ladder entirely.
See `public/js/doxa-maps-build/doxa-maps/demo-map/demo-map/maplibre/index.html`.

### Mapbox — requires a public (`pk.`) token

Mapbox-based maps **do** require a Mapbox **public token** (a `pk.` token).

**Server endpoint — `GET /api/maps/token`** (`server/api/maps/token.get.ts`)
returns JSON `{ token, type }` (with an optional `expires_in`):

- If a **public key** (`pk.`) is configured, it is returned directly as
  `{ token, type: 'pk' }`.
- If a **secret key** (`sk.`) is configured, the endpoint JWT-decodes the SK to
  find the Mapbox username, calls the Mapbox Tokens API to mint a short-lived
  (1-hour) read-only **temporary token** (`tk.`), caches it in-process, and
  returns `{ token, type: 'tk', expires_in }`. The `sk.` itself is read from a
  server-only runtime config entry and is never sent to the client.
- If no key is configured, it responds with a 500 error.

**Static drop-in maps — token ladder (precedence order):** the built map pages
resolve a Mapbox token by walking this ladder (see
`public/js/doxa-maps-build/doxa-maps/doxa-simple-map/doxa-simple-map/engagement/index.html`).
Rungs 1–3 yield a token used **directly, with no network call**:

1. A token hardcoded into the page's profile-config (`config.tk`)
2. A `?tk=` URL parameter carried in a shared link
3. A baked build token inlined at build time (empty by default)

If none of those provide a token, the page resolves a token **endpoint** and
fetches it — falling through `window.MAP_TOKEN_URL`, a configured `TOKEN_SRC`,
then the same-origin `/api/maps/token`.

### Configuring a deployment

Environment variable names come from `.env.example`:

- **`NUXT_PUBLIC_MAPBOX_TOKEN`** — set this to your Mapbox **public** token
  (`pk.…`) and `GET /api/maps/token` will serve it directly. This is the simplest
  setup and is what the prayer map on `/pray` uses.
- **`NUXT_MAPBOX_KEY`** (server-only, exposed as runtime config `mapboxKey`) —
  the endpoint prefers this if present. Set it to a **secret** key (`sk.…`) to
  have the server auto-mint short-lived `tk.` tokens; the secret never reaches
  the client. If set to a `pk.` token it is returned as-is.
