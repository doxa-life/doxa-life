# Map App Integration Guide

> **Branch:** `map-merge`  
> **Date:** 2026-04-17  
> **Audience:** WordPress theme developer integrating the `<doxa-map>` web component

---

## Architecture

<p align="center">
  <img src="./architecture.svg" alt="Map App Architecture" width="1000"/>
</p>

---

## What Is This?

A self-contained **Vue 3 map micro-frontend** compiled to a single IIFE bundle (`map-app.iife.js`). It registers a `<doxa-map>` custom element that runs inside its own **Shadow DOM** — completely isolated from the WordPress theme's CSS and JavaScript.

You drop one PHP partial into a page template and the map appears. The bundle handles everything else: Mapbox, data fetching, legend, popups, pin filtering.

---

## Where Things Live

```
SOURCE CODE (separate GitHub repo):
  DOXA/doxa-map-mfe/         ← Vue 3 + Vite app — edit this to change the map

BUILT OUTPUT (copied here on build):
  assets/map-app/
    map-app.iife.js          ← The map application
    map-app.css              ← Scoped component styles (Shadow DOM internals)
    map-app-slot.css         ← Slot/wrapper layout (.doxa-map-slot class)

WORDPRESS INTEGRATION:
  partials/shadow-dom-slot.php   ← The only PHP file you need to call
  functions.php                  ← Enqueues Mapbox + the IIFE + map-app-slot.css on map pages
```

> **Workflow:** Edit source → `npm run build` in `doxa-map-mfe` → bundle auto-copies to `assets/map-app/` and to your local WP site.

---

## Architecture in 30 Seconds

```
WordPress page template
  └── get_template_part('partials/shadow-dom-slot', ...)
        └── <doxa-map profile-config='{...}'>   ← custom element
              └── Shadow DOM boundary
                    └── Vue app (Pinia store, Mapbox canvas, Legend UI)
```

**Why Shadow DOM?**  
The map ships its own CSS. Without Shadow DOM, Mapbox class names (`.mapboxgl-*`) and theme class names collide. Shadow DOM gives the map a completely isolated rendering context — no leakage in or out.

**Why one Pinia store per instance?**  
Each `<doxa-map>` tag on the page gets its own isolated Pinia instance. This means two maps on the same page (e.g. a prayer map and an adoption map) never share legend state, filter state, or selected pin.

---

## How to Embed a Map (the one call you need)

```php
<?php get_template_part( 'partials/shadow-dom-slot', null, [

    // ── Required ──────────────────────────────────────────────
    'profile'      => 'doxa-simple-map',
    'tk'           => defined('MAPBOX_PUBLIC_TOKEN') ? MAPBOX_PUBLIC_TOKEN : '',

    // ── Recommended ───────────────────────────────────────────
    'instance_id'  => 'pray-map',       // unique per page — scopes Pinia store
    'data_source'  => 'pray-tools',     // 'pray-tools' | 'doxa-api' | 'doxa-csv'

    // ── Tab config (controls legend + pin color + popup) ──────
    'tabs'         => [ [
        'id'            => 'prayer',    // matches internal color strategy
        'label'         => 'Prayer',
        'colorStrategy' => 'prayer',    // 'prayer' | 'engagement' | 'adoption'
        'legend'        => 'prayer',    // which legend component renders
        'popup'         => 'prayer',    // which popup content renders
    ] ],

    // ── Sizing (optional) ─────────────────────────────────────
    'radius'       => 'md',             // 'none' | 'md' | 'xlg'
    'aspect_ratio' => '16/7',

] ); ?>
```

---

## The `tabs` Prop — The Key to Everything

**`tabs` is the entire contract between WordPress and the map.** It controls three things atomically:

| `tabs` field      | Controls                          |
|-------------------|-----------------------------------|
| `colorStrategy`   | Pin colors on the Mapbox layer    |
| `legend`          | Which legend items render         |
| `popup`           | What shows when you click a pin   |

**Rule:** 1 tab = no tab bar shown. 2+ tabs = tab bar shown at top of map.

### Page → Tab Mapping (current)

```
front-page.php  →  instance: home-map   →  tabs: [engagement]
page-pray.php   →  instance: pray-map   →  tabs: [prayer]
page-adopt.php  →  instance: adopt-map  →  tabs: [adoption]
```

### Visual: one `profile-config` attribute drives the whole map

```
profile-config='{
  "profile":    "doxa-simple-map",   ← which Vue component to mount
  "instanceId": "pray-map",          ← Pinia store scope key
  "dataSource": "pray-tools",        ← which API/CSV to load
  "tk":         "pk.eyJ...",         ← Mapbox token (from wp-config.php)
  "tabs": [{
    "id":             "prayer",
    "colorStrategy":  "prayer",      ← blue dots = has prayer
    "legend":         "prayer",      ← legend shows prayer counts
    "popup":          "prayer"       ← popup shows prayer action button
  }]
}'
```

---

## Mapbox Token — Where It Lives

The token **must not be in the theme repo**. It lives in `wp-config.php` only:

```php
// wp-config.php  (server only — never committed to git)
define( 'MAPBOX_PUBLIC_TOKEN', 'pk.eyJ...' );
```

The theme reads it safely:

```php
// Any page template
'tk' => defined('MAPBOX_PUBLIC_TOKEN') ? MAPBOX_PUBLIC_TOKEN : '',
```

```php
// functions.php — also used for the legacy prayer-map script
'mapboxToken' => defined('MAPBOX_PUBLIC_TOKEN') ? MAPBOX_PUBLIC_TOKEN : '',
```

> Mapbox public tokens (`pk.eyJ...`) are safe to expose in HTML — they are rate-limited and domain-restricted per your Mapbox account settings. But keeping them in `wp-config.php` keeps the repo clean and lets different environments (local, staging, production) use different tokens.

---

## What Changed on `map-merge` Branch

| File | What Changed |
|---|---|
| `assets/map-app/map-app-slot.css` | **New file** — defines `.doxa-map-slot` wrapper class; sizes the host element (aspect-ratio, min-height, mobile overrides). Enqueued by WordPress on map pages only. |
| `assets/map-app/` | **New folder** — compiled IIFE bundle lives here (gitignored build output) |
| `functions.php` | Added `doxa_map_app_scripts()` — enqueues Mapbox v3, geocoder plugin, IIFE, `map-app.css`, and `map-app-slot.css` on map pages only |
| `front-page.php` | Added map section between hero and stats (engagement view) |
| `page-pray.php` | Added map section below hero (prayer view) |
| `page-adopt.php` | Added map section below hero (adoption view) |

---

## How the Map Is Rendered — The `.doxa-map-slot` Class

**The map renders because `<doxa-map>` is wrapped in a `<div class="doxa-map-slot">`.** That wrapper div owns all the sizing. `<doxa-map>` fills it absolutely. Shadow DOM handles everything inside.

The PHP partial outputs something like this:

```html
<div class="doxa-map-slot rounded-md">
  <doxa-map profile-config='{...}'></doxa-map>
</div>
```

The `.doxa-map-slot` class is defined in — and only in:

```
assets/map-app/map-app-slot.css
```

This file is **part of the map app bundle**, not the WordPress theme's SCSS. It is enqueued by `doxa_map_app_scripts()` in `functions.php` alongside the IIFE. Because it lives next to the bundle, it survives bundle rebuilds and works in any host environment (WordPress, Nuxt, plain HTML) without touching the theme stylesheet.

**Radius modifier classes** are optional additions from the theme's existing `_shapes.scss` utilities:

| Class | Border Radius | Used on |
|---|---|---|
| `.rounded-md` | `2.5rem` | Pray, Adopt pages |
| `.rounded-xlg` | `3.5rem` | Homepage map slot |

> **Rule of thumb:** if the map looks wrong (too short, cut off, wrong shape), the fix is in `map-app-slot.css` or the inline CSS custom properties — not in the Vue app and not in the theme SCSS.

---

## Slot Sizing

The wrapper element is sized by `map-app-slot.css`, not the map app. Override per-instance via inline CSS custom properties (set by the PHP partial):

```php
// Default: 16:9 aspect ratio (desktop), 1:2 portrait (mobile)
// Nothing needed — map-app-slot.css handles it

// Override height directly (skips aspect-ratio):
'height_desktop' => '560px',
'height_mobile'  => '480px',

// Override aspect ratio:
'aspect_ratio'   => '16/9',   // desktop
// mobile always 1/2 (portrait) — hardcoded in map-app-slot.css
```

---

## Adding a New Map Page

1. Create your PHP template (e.g. `page-give.php`)
2. Call `get_template_part( 'partials/shadow-dom-slot', ... )` with a unique `instance_id`
3. Add the page slug to `doxa_map_app_scripts()` in `functions.php`:
   ```php
   $is_map_page = is_front_page() || is_page('pray') || is_page('adopt') || is_page('give');
   ```
4. No JS or CSS changes needed — the IIFE handles it all.
