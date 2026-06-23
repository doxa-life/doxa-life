# Research — industry-standard API-connection organization for multi-profile apps

**Question (card cc0746ae):** How do similar IIFE multi-bundle systems organize API
connections across many app profiles? Does the industry have a *better* standard than our
current 3-seam pattern? Goal: organize so agents can understand and extend without confusion.

**Method.** Four comparable families researched independently, web-grounded: (1) GIS
declarative source registries (Mapbox/MapLibre **style-spec `sources`**, deck.gl); (2)
data-integration connectors (**Singer/Meltano, Airbyte, Gatsby source plugins**); (3)
frontend data layers (**RTK Query, TanStack Query, Repository/Anti-Corruption-Layer, OpenAPI
codegen**); (4) **micro-frontend** data ownership / BFF / embeddable-widget config.

## Verdict — keep the design; it's already industry-standard

**Our current pattern is not behind the industry — it independently rebuilt the strongest
parts of it.** The `sources.json` registry + `DataSourceManager` (fetch→normalize→cache) +
`fieldMappings → systemFields` is, point for point, the same architecture as the most mature
comparables. Do **not** refactor toward the heavy ELT runtimes (Singer/Airbyte are
process/container-per-source — wrong weight class for a browser IIFE).

| Our piece | Matches industry standard | Notes |
|---|---|---|
| `sources.json` (registry keyed by id, `type`, `activeSource`) | Mapbox/MapLibre style-spec **`sources`** object (id + `type` discriminant + runtime resolver); Meltano **`meltano.yml`** | Our registry is the validated pattern. |
| `type: csv \| api \| rest-api` switch | GL's `type` discriminant; Repository/**Adapter** interface | Solid; see improvement #3 (make it open). |
| `fieldMappings → systemFields` | **DDD Anti-Corruption Layer** ("protect the domain model"); Meltano **Stream Maps**; RTK `transformResponse`; TanStack `select` | **Stronger than the GL style-spec**, which has no source-level rename and leaks raw fields downstream. This is our single best idea — keep & formalize. |
| `apiBaseUrl.js` runtime resolution (`window.MAP_APP_API_URL` → `VITE_API_BASE_URL` → `''`) | MFE "build once, embed anywhere" runtime config; **BFF**-as-projection | Industry-standard; see improvement #7 (harden the global). |
| `DataSourceManager` engine | client-side **BFF/projection** (AWS endorses in-bundle transform when no server BFF) | Right place for fetch/transform/cache. |
| `_registry.js` front door | `meltano.yml`-as-single-entry; gatsby-config plugin array | Good — keep one front door. |

> One-line summary: **we are a browser-native Meltano with a GL-style source registry and a
> BFF-style projection layer.** The architecture is right; the gaps are refinements.

## Prioritized improvements (each anchored to a standard + an agent-clarity payoff)

Ordered by value for the card's stated goal — *agents understand and extend without confusion.*

### 1. Per-profile source **selection**, not a single global `activeSource` — *(highest)*
Today every app-profile shares one `src/config/sources.json` and one global `activeSource`.
Every family flags this as the coupling trap and prescribes **separating shared connector
*definitions* from per-app *binding***: GL "one self-contained style per app," Meltano
`environments`, Gatsby per-site config, RTK `injectEndpoints`, MFE per-MFE data ownership
("a shared dependency where one team's upgrade breaks another" — microfrontend.dev).
- **Do:** keep `sources.json` as the shared **catalog**; let each app-profile's `index.js`
  declare which source id(s) it activates (an ordered list: primary + fallbacks — we already
  have `fallbackSourceId`, so formalize it). Drop the single global `activeSource`.
- **Agent payoff:** an agent reads ONE profile and sees exactly which data it uses — no hidden
  global state, no risk that editing the shared `activeSource` silently breaks another map.

### 2. Make `systemFields` an **enforceable, versioned contract** — *(high)*
All four frameworks leave cross-source contract conformance to humans (Singer validates a
record against *its own* schema, not a shared model; the ACL goal is to *protect* the model).
This is the cheapest gap to close and we own both ends.
- **Do:** at normalize time in `DataSourceManager`, assert every `required: true` system field
  resolved to a non-empty value per row; drop/log violators with the offending source id +
  field. Version the `systemFields` contract; components depend on it, never on raw fields.
- **Agent payoff:** "did I map everything?" becomes a build/runtime error naming the missing
  field — instead of a silent `''`/`0` that surfaces as a blank map later.

### 3. Open **adapter registry** for `type`, not a closed switch — *(high)*
GL's closed `type` enum is its documented weakness (a new source type needs renderer
plumbing). The Repository/Adapter lesson: adding a source type should be a drop-in.
- **Do:** register `csv`/`api`/`rest-api` (and future `geojson`/`tilejson`) handlers by key in
  `_registry.js`; each implements a small `{ fetch, normalize }` adapter interface. Adding a
  type = drop one adapter file + one registry line.
- **Agent payoff:** "how do I add a new kind of source?" has one obvious, mechanical answer.

### 4. Composite **cache key = (sourceId, endpoint, args)** + prefix invalidation — *(medium)*
TanStack `queryKey` and RTK arg-keyed tags both prove caching must be keyed by source+query so
multi-profile bundles never collide or stale-share. Our per-source cache should be addressed
by a composite key, and invalidation should target a source/query prefix.

### 5. Drift **`discover()`** affordance — *(medium)*
Singer/Airbyte's biggest win is a source that *declares* its raw schema, so drift is
detectable. (Our `sources.json` was itself "merged on drift" — exactly this pain.)
- **Do:** add a lightweight `discover()` to `DataSourceManager` that fetches one record and
  reports which `fieldMappings` raw keys are actually present → turns silent mapping rot into a
  visible diff. Pairs with the existing CSV `validateFieldMappings()` warning.

### 6. Borrow Meltano **Stream Maps vocabulary** (not the engine) — *(medium)*
For derivations currently baked into `systemFields` prose (e.g. engagement/adoption status),
adopt explicit declarative verbs — a `__filter__` row predicate, computed/`__derive__` fields,
a drop/`__null__` marker. Keep the engine as small pure JS functions; steal only the grammar.

### 7. **Harden + namespace** the runtime config — *(medium; LK10X-relevant)*
A bare `window.MAP_APP_API_URL` on a third-party page is collision- and tamper-prone
("global exposure via `window` … vulnerable through the console" — raulmelo.me).
- **Do:** prefer reading the embed's own script tag (`document.currentScript.dataset.apiUrl`)
  or a single namespaced `window.MAP_APP_CONFIG = {…}`; treat the value as **public host-supplied
  data only**. Document the hard boundary: a pure client IIFE may receive only public
  base-URLs — **any auth/secret aggregation must move to a server endpoint (a real BFF), never
  into `sources.json` or `window`** (AWS lists "authorization toward private APIs" as BFF-only).

### 8. Smaller wins
- **Components see only system fields** — hard rule; `_registry.js` exposes source-agnostic
  accessors / normalized records, never raw source objects (ACL discipline; RTK re-export pattern).
- **Validate `sources.json` against a JSON schema at build time** (as GL validates against the
  style spec) so a malformed source is caught before bundling — pairs with `generate-index.sh`.
- **PII redact/hash markers** per system field in the normalize step (Airbyte Mappers) — a
  natural, well-precedented home for LK10X anonymity enforcement.

## What NOT to do (anti-patterns the research surfaced)
- Don't adopt Singer/Airbyte **runtimes** (container-per-source ELT — wrong weight class).
- Don't let **large data inline** into config (GL's `geojson.data` smell — keep config thin:
  paths/endpoints only, as we already do).
- Don't keep a **flat-global id namespace / single shared mutable `activeSource`** across all
  profiles (the MFE coupling trap) — scope activation per profile (improvement #1).
- Don't rely on **schema inference** for the canonical model (Gatsby's famously fragile
  infer-then-override) — keep the explicit `systemFields` declaration.

## For agents (the confusion-killing summary)
> **To add data to a map:** add a connection to the shared catalog `src/config/sources.json`
> (id, `type`, locator, `fieldMappings` → system fields), then **activate it in your own
> app-profile's `index.js`** (not via a global). Components only ever see **system fields**, so
> no component changes are needed. To add a new *kind* of source, drop a `{ fetch, normalize }`
> adapter into the type registry. Never put secrets in `sources.json` or `window` — the bundle
> gets only public base-URLs at runtime.

## Sources (primary docs verified)
- GIS: maplibre.org/maplibre-style-spec/sources, maplibre-gl-js Map API (`addSource`/`setStyle`
  diff/`transformStyle`); docs.mapbox.com/style-spec; deck.gl Layer/loaders.
- Connectors: singer-io/getting-started SPEC; docs.meltano.com + sdk.meltano.com Stream Maps;
  docs.airbyte.com Protocol + Mappings (v1.3); gatsbyjs.com schema-generation / createTypes.
- Frontend: redux-toolkit.js.org RTK Query (`createApi`/`injectEndpoints`/`transformResponse`/
  tags); tanstack.com/query (`queryKey`/`select`); DDD Anti-Corruption Layer (Microsoft Azure
  Architecture Center, AWS Prescriptive Guidance); Orval / openapi-typescript.
- Micro-frontends: webpack.js.org module-federation; AWS Prescriptive Guidance BFF; samnewman.io
  BFF; jmperezperez.com / bguiz.com embeddable widgets; alexlobera.com shared-cache;
  Atomic Object / SIMPL runtime config.
