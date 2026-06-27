// useMapTheme.js — shared light/dark theme for every map profile.
//
// SEAMLESS theme switch (coder: "switching styles flashes + pins disappear — not seamless").
// Both light AND dark use the SINGLE Mapbox **Standard** style; the theme is just its
// `lightPreset` config (light = 'day', dark = 'night'). Flipping lightPreset via
// `map.setConfigProperty('basemap','lightPreset', …)` re-lights the basemap WITHOUT any
// setStyle reload — so custom layers (pins, prayer glow, regions) are NEVER wiped, there is
// NO rebuild, NO flash, and the toggle is instant. (This is the only seamless option:
// switching between two DIFFERENT style documents — e.g. light-v11 ↔ Standard — always
// forces a full Mapbox reload, which is what caused the flash + pins-disappearing.)
//
// Custom layers carry `*-emissive-strength: 1` (see useMapLayers) so they keep their true
// colour under the Standard 'night' lighting.
//
// Usage in a profile:
//   const mapTheme = useMapTheme(uiStore)
//   // map creation:  style: mapTheme.bootStyle()             // ALWAYS the Standard style
//   // after first style.load (onMapReady): mapTheme.applyTheme(map.value)   // sets day/night
//   // a profile watch(uiStore.theme) → applyTheme keeps it in sync; toggle just flips uiStore.
//   // toggle button: mapTheme.swapTheme(map.value)           // flips lightPreset, NO reload

export const STANDARD_STYLE = 'mapbox://styles/mapbox/standard'
// Back-compat aliases — the basemap is the single Standard style; light/dark is a lightPreset.
export const LIGHT_STYLE = STANDARD_STYLE
export const DARK_STYLE  = STANDARD_STYLE

export function useMapTheme(uiStore) {
  // Single pending 'idle' re-assert guard (per map instance). Prevents stacking one
  // idle handler per toggle during a fast light<->dark burst — see applyTheme().
  let reassertPending = false

  // True when dark is the persisted/active theme (localStorage fallback for the boot window).
  function isDarkTheme() {
    return uiStore?.theme === 'dark'
      || (typeof localStorage !== 'undefined' && localStorage.getItem('theme') === 'dark')
  }

  // The Standard-style lightPreset for the current theme.
  function lightPreset() { return isDarkTheme() ? 'night' : 'day' }

  // BOOT style — ALWAYS the Standard style. The persisted theme is applied as a lightPreset
  // by applyTheme() once the style has loaded (the 'basemap' config import only exists after
  // style.load, so we can't set it at map creation).
  function bootStyle() { return STANDARD_STYLE }

  // Apply the CURRENT theme's lightPreset to the basemap. Robust + idempotent: recomputes
  // lightPreset() fresh (rapid toggles can't desync — last call wins) and re-applies on
  // 'idle' if the style wasn't ready. Call from onMapReady (boot) AND a watch(uiStore.theme).
  function applyTheme(map) {
    if (!map) return
    // Recompute the desired preset FRESH on every call (and again inside set) so the
    // newest toggle always wins — never capture a stale `dark` across rapid toggles.
    const set = () => {
      const dark = isDarkTheme()
      try {
        // lightPreset = day/night lighting.
        map.setConfigProperty('basemap', 'lightPreset', dark ? 'night' : 'day')
        // theme = the Standard colour theme. Light mode uses the LIGHTER, cleaner
        // 'monochrome' theme (closer to a flat white map); dark keeps the default
        // colourful theme the coder loves. Both are config props, so the toggle stays
        // SEAMLESS (no setStyle, no reload, pins never wiped).
        map.setConfigProperty('basemap', 'theme', dark ? 'default' : 'monochrome')
      } catch (e) { console.warn('[useMapTheme] setConfigProperty failed:', e) }
    }
    // Apply immediately so a single / slow toggle stays instant (no regression).
    set()
    // FAST-TOGGLE GREY-FILM FIX: rapidly flipping lightPreset races the Standard
    // style's day<->night lighting transition; a toggle landing mid-transition can
    // leave a grey film over the country fills (the basemap gets stuck half-lit).
    // Re-assert the LATEST theme once the basemap settles ('idle') so the terminal
    // state ALWAYS wins, regardless of toggle speed (last-write-wins). During a fast
    // burst the map never goes idle until toggling stops, so this fires exactly once
    // at the end with the final theme. One pending re-assert is enough — guard against
    // stacking a handler per toggle.
    if (!reassertPending) {
      reassertPending = true
      try {
        map.once('idle', () => { reassertPending = false; set() })
      } catch (_) { reassertPending = false }
    }
  }

  // Toggle the theme: flip uiStore (the single source of truth), then re-light the basemap
  // via lightPreset. NO setStyle — custom layers persist, the prayer glow keeps running, no
  // rebuild/flash/ghost. Each profile also watches uiStore.theme → applyTheme as a sync
  // safety-net so the basemap can't drift out of sync across tabs / rapid toggles.
  function swapTheme(map) {
    uiStore.toggleTheme()
    applyTheme(map)
  }

  return { STANDARD_STYLE, LIGHT_STYLE, DARK_STYLE, isDarkTheme, lightPreset, bootStyle, applyTheme, swapTheme }
}
