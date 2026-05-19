# Prayer Ripple Animation

Animated expanding rings on prayed-for pins, inspired by CSS keyframe ripple
patterns. Located in `src/composables/useMapLayers.js`.

## How it works

The animation uses Mapbox GL circle layers with transparent fills and colored
strokes to create expanding ring outlines. It replicates the classic CSS
`@keyframes` ripple pattern used in water/WiFi/radar animations:

```css
/* The CSS pattern this imitates */
@keyframes waves {
  0%   { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(3); opacity: 0;   }
}
```

### Layer structure

| Layer ID               | Purpose                                        |
|------------------------|-------------------------------------------------|
| `prayer-glow-base`     | Static colored disc behind the pin (0.45 opacity, 0.3 blur) |
| `prayer-glow-ring-0..3`| 4 expanding ring layers (transparent fill, colored stroke)   |

All layers filter on `peoplePraying > 0` and sit below `language-family-pins`
in the Mapbox layer stack.

### Animation math

Each frame (`requestAnimationFrame` tick):

```
delay       = i * (CYCLE_SEC / RING_COUNT)     // stagger: 0s, 1.5s, 3s, 4.5s
t           = (elapsed - delay) % CYCLE_SEC    // per-ring local time
phase       = t / CYCLE_SEC                    // 0.0 → 1.0

radiusScale = MIN_SCALE + phase * (MAX_SCALE - MIN_SCALE)   // 0.3x → 2.5x pin
opacity     = 0.5 * (1.0 - phase)                           // 0.5 → 0 (linear)
strokeWidth = 2.5                                            // constant
```

### Constants

| Constant     | Value | Meaning |
|-------------|-------|---------|
| `RING_COUNT`| 4     | Number of concentric expanding rings |
| `CYCLE_SEC` | 6.0   | Full cycle duration per ring (seconds) |
| `MIN_SCALE` | 0.3   | Starting radius multiplier (inside the pin dot) |
| `MAX_SCALE` | 2.5   | Ending radius multiplier (2.5x the pin) |

### Color logic

Ring color is data-driven via a Mapbox expression:

- `peoplePraying >= 144` (full prayer threshold) → green `#15803d`
- `peoplePraying > 0` → dark orange `#d97706`
- Otherwise → transparent (ring not rendered)

### z-index ordering

Prayed-for pins render underneath unprayed pins so the eye focuses on people
groups that still need prayer:

```
circle-sort-key:
  fullPrayer (>=144) → 1  (bottom)
  hasPrayer (>0)     → 1  (bottom)
  noPrayer           → 3  (top)
```

## Filter coupling (syncGlowFilter)

When legend filtering dims pins, the glow must hide too. `syncGlowFilter(matchExpr)`
combines the base prayer filter with any active legend filter:

```js
filter = matchExpr ? ['all', base, matchExpr] : base
```

Wired into both bundles at every filter path: legend select, legend clear,
applyLegendFilter (simple map), applyDimFilter (research map).

## API

| Function           | Description |
|-------------------|-------------|
| `startPrayerGlow()`  | Add glow layers + start rAF loop. Idempotent. |
| `stopPrayerGlow()`   | Cancel rAF + remove glow layers + reset sort key. |
| `syncGlowFilter(expr)` | Apply extra Mapbox filter to all glow layers. |

Called from profile components on:
- Tab switch (start on prayer tab, stop on others)
- Initial load (if prayer tab is default)
- Theme swap (restart after style.load)
- Unmount (cleanup)

## Design iterations

The animation went through multiple iterations to reach the current state:

1. **Blurry circles** — too subtle at low zoom
2. **Dual concentric rings** — visible but static-looking
3. **3-layer glow** — better but still not animated enough
4. **Expanding rings with sine fade** — pulsed due to phase wrap
5. **Conveyor belt (barber pole)** — smoother but still had wrap jitter
6. **CSS keyframe replica** — current. Linear scale + linear fade + staggered
   delay. Rings start inside the pin (0.3x) and expand outward, creating the
   appearance of emanating from the dot center. No sine curves, no complex
   easing — matches the proven CSS `@keyframes` pattern exactly.
