# Metaball Orbit Buttons — Interactive Prototype

Self-contained HTML/Canvas prototype. No dependencies, no build step. Open `metaball-orbit-buttons.html` in any modern browser.

## What it is

Four buttons rendered as metaballs orbiting a shared origin in 3D. They merge and separate organically as their orbits breathe in and out of phase.

| Button | Color | Radius | Base Orbit |
|--------|-------|--------|------------|
| `+` coral | `rgb(228,115,85)` | 48px | 88px |
| `✦` warm | `rgb(240,185,150)` | 36px | 102px |
| `+` blue | `rgb(90,145,220)` | 44px | 95px |
| `+` purple | `rgb(168,105,215)` | 40px | 110px |

## Interaction

- **Click empty space** → set orbit origin
- **Drag empty space** → live-drag origin
- **Click a button** (no drag) → activate (color pulse + screen flash)
- **Hold + drag a button** → pull it out of orbit; other balls are gravitationally attracted and follow; releases smoothly back

## Rendering approach

Proper implicit-field metaballs, not gradient-overlap. For every pixel in the bounding box:

```
field(px) = Σ  r² / (d² + 1)   for each ball
```

If `field > 1.0`, pixel is inside the surface. Color is contribution-weighted: each ball's color is blended proportionally to its field contribution at that pixel. Anti-aliased via smoothstep over a narrow band (`EDGE = 0.15`).

Runs on an offscreen canvas at 0.35× resolution, bilinear-upscaled to display. The low-res + smoothstep combination produces clean edges without per-pixel cost at full resolution.

## Animation

- **3D orbit**: tilted plane (`TILT = π × 0.38`), depth drives scale and label opacity
- **Radius oscillation**: each ball's orbit radius oscillates ±15px on a slow sine with unique phase offsets (~35s full cycle)
- **Speed bursts**: every 4–12 seconds a random ball accelerates to ~2.8× base speed for 1.2–2.7 seconds (sin-eased in/out)
- **Inter-ball gravity**: each ball exerts a `G/d²` pull on every other ball, biasing their orbit targets. Dragged balls pull ~2× harder (`DRAG_GRAV`), so the swarm follows your cursor

## Key tunables

| Parameter | Location | What it does |
|-----------|----------|-------------|
| `RES` | top of script | Offscreen render scale. Lower = faster, softer edges. `0.35`–`0.5` is the sweet spot |
| `THR` | `renderMetaballs()` | Field threshold. Lower = earlier merge between balls |
| `EDGE` | `renderMetaballs()` | Anti-alias band width. `0.1` = sharper, `0.3` = softer |
| `TILT` | orbit config | Orbit plane tilt angle. `0` = flat circle, `π/2` = edge-on |
| `GRAV` | orbit physics | Inter-ball gravitational pull strength at rest |
| `DRAG_GRAV` | orbit physics | Pull strength toward a dragged ball (~2× `GRAV`) |
| `MIN_DIST` | orbit physics | Softening distance — prevents jitter when balls overlap |
| `baseOrbitR` | per ball | Rest orbit radius before oscillation |
| `±15` | oscillation line | Amplitude of orbit breathing |
| `0.18` | oscillation line | Breathing speed (radians/sec) |
| `BURST_MULT` | burst config | Speed multiplier during bursts |
| `baseSpeed` | per ball | Angular velocity (rad/s) at rest |
| `DEPTH_SCALE` | orbit config | How much z-depth affects ball size |

## Upgrade path

For more balls or higher resolution, move the field evaluation to a WebGL fragment shader — the math is identical (`r²/d²` sum + threshold), just runs on GPU. The interaction and orbit code stays unchanged. See Jamie Wong's [Metaballs and WebGL](https://jamie-wong.com/2016/07/06/metaballs-and-webgl/) for the shader pattern.
