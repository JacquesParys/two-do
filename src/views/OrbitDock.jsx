import { useEffect, useRef, useState } from "react";
import { COLORS, FONTS, ensureFonts } from "../theme";
import { laneLabel, laneColor, SLOTS } from "../lib/lanes.js";
import LaneFilter from "../components/LaneFilter.jsx";

// ── The metaball orbit dock ──────────────────────────────────────────────────
// A faithful port of docs/plans/prototypes/metaball-orbit-buttons.html, wired to
// real app actions. Four orbs orbit a fixed origin in the bottom-right: the three
// lanes (Me / You / Us) + the ✦ Grown-Up.
//   • Tap a lane orb   → onCreate(laneSlot)  (new item pre-set to that lane)
//   • Tap the ✦ orb    → onGrownUp()         (open the capture sheet)
//   • Drag a lane orb out toward the centre of the screen → onFilter(laneSlot);
//     it parks above the cluster as the active-filter indicator. Tap it / drag it
//     back to the corner → onFilter("all").
//   • Drag the ✦ orb   → springs back, no effect in v1 (reserved, see doc §12).
// The canvas spans the whole stage so dragged orbs aren't cropped; pointer input
// is caught by a small corner region and tracked globally via pointer capture.
// Engine state lives in refs (never React state) so the rAF loop never re-renders.

// Corner region that catches the initial tap/drag (the resting cluster lives here;
// once a drag starts, pointer capture tracks it across the whole stage).
const HIT_W = 250;
const HIT_H = 330;

// ── Engine tunables ──
// Field is rendered at device-pixel sharpness, capped to this many offscreen
// pixels for perf (resolution drops only when an orb is flung far out).
const OFF_BUDGET = 200000;
const TILT = Math.PI * 0.38;
const cosTilt = Math.cos(TILT);
const sinTilt = Math.sin(TILT);
const DEPTH_SCALE = 0.0025; // z → ball size
const DEPTH_BRIGHT = 0.1; // z → field brightness
const THR = 1.0; // merge threshold
const EDGE = 0.15; // anti-alias half-band
const GRAV = 900; // ambient inter-ball pull (lower → orbs stay more distinct)
const MIN_DIST = 18; // gravity softening
const BURST_MULT = 2.6; // speed-burst multiplier
const PROX_DIST = 90; // sparkle proximity-spin falloff
// Latch as a fraction of the corner→centre distance: you must drag roughly toward
// the middle of the screen before the filter latches (LATCH), and drag a parked
// orb back near the corner to clear it (CLEAR).
const LATCH_FRAC = 0.6;
const CLEAR_FRAC = 0.3;

// Near-white warm tint for the ✦ Grown-Up (not a lane color).
const SPARK_RGB = { r: 248, g: 240, b: 235 };

function hexToRgb(hex) {
  const h = (hex || "#ffffff").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

// Build the four orbs. `role` ties an orb to its lane slot (resolved from ctx).
function makeBalls() {
  // Small orbit radii + large ball radii → a tight, chunky metaball swarm.
  return [
    { role: "us",    slot: SLOTS.SHARED, angle: 0,              baseOrbitR: 26, orbitR: 26, speed: 0.4,  baseSpeed: 0.4,  baseR: 26, r: 26, fSize: 16, fontW: "600", phaseOffset: 0,   x: 0, y: 0, z: 0, dragging: false, activated: 0 },
    { role: "spark", slot: null,         angle: Math.PI * 0.55, baseOrbitR: 40, orbitR: 40, speed: 0.38, baseSpeed: 0.38, baseR: 17, r: 17, fSize: 16, fontW: "600", phaseOffset: 1.3, x: 0, y: 0, z: 0, dragging: false, activated: 0, spinAngle: 0 },
    { role: "me",    slot: null,         angle: Math.PI,        baseOrbitR: 32, orbitR: 32, speed: 0.42, baseSpeed: 0.42, baseR: 23, r: 23, fSize: 15, fontW: "600", phaseOffset: 2.7, x: 0, y: 0, z: 0, dragging: false, activated: 0 },
    { role: "you",   slot: null,         angle: Math.PI * 1.5,  baseOrbitR: 48, orbitR: 48, speed: 0.36, baseSpeed: 0.36, baseR: 21, r: 21, fSize: 14, fontW: "600", phaseOffset: 4.1, x: 0, y: 0, z: 0, dragging: false, activated: 0 },
  ];
}

// While dragging, the orb's bottom-right edge sits at the finger so the body stays
// visible up-left of the thumb. Offset = ball radius × this factor.
const DRAG_ANCHOR = 0.9;

function orbitPos(angle, R) {
  const ox = Math.cos(angle) * R;
  const oz = Math.sin(angle) * R;
  return { dx: ox, dy: -oz * sinTilt, z: oz * cosTilt };
}

// Resolve each orb's label + {r,g,b} color from the viewer context.
function resolveIdentity(ball, ctx) {
  const viewer = ctx?.viewerSlot || SLOTS.A;
  const other = viewer === SLOTS.A ? SLOTS.B : SLOTS.A;
  if (ball.role === "spark") return { label: "✦", color: SPARK_RGB, slot: null };
  const slot = ball.role === "us" ? SLOTS.SHARED : ball.role === "me" ? viewer : other;
  const label = laneLabel(slot, viewer, ctx?.space);
  const hex = ctx ? laneColor(slot, ctx.people, COLORS) : ball.role === "me" ? COLORS.laneMe : ball.role === "you" ? COLORS.laneYou : COLORS.laneUs;
  return { label, color: hexToRgb(hex), slot };
}

function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(
    typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export default function OrbitDock({ ctx, laneFilter = "all", onCreate, onGrownUp, onFilter, paused = false }) {
  const reducedMotion = usePrefersReducedMotion();

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  // Mutable engine state (never triggers a render).
  const ballsRef = useRef(makeBalls());
  const originRef = useRef({ x: 0, y: 0 });
  const parkRef = useRef({ x: 0, y: 0 });
  const labelCachesRef = useRef([]);
  const rafRef = useRef(0);
  const dimsRef = useRef({ W: HIT_W, H: HIT_H, dpr: 1 });
  const offCanvasRef = useRef(null);
  const startLoopRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ ball: -1, hasMoved: false, startX: 0, startY: 0 });

  // Live copies of props the loop/handlers read (so the loop stays mount-only).
  const cbRef = useRef({ onCreate, onGrownUp, onFilter });
  const laneFilterRef = useRef(laneFilter);
  const pausedRef = useRef(paused);
  const docHiddenRef = useRef(false);
  const offscreenRef = useRef(false);

  useEffect(() => { cbRef.current = { onCreate, onGrownUp, onFilter }; }, [onCreate, onGrownUp, onFilter]);
  useEffect(() => { laneFilterRef.current = laneFilter; }, [laneFilter]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ── Label bitmap caches (blurred Fraunces, knockout color = COLORS.bg) ──
  const buildLabelCaches = () => {
    const balls = ballsRef.current;
    const caches = [];
    for (const b of balls) {
      const pad = 6;
      const tmp = document.createElement("canvas").getContext("2d");
      tmp.font = `${b.fontW} ${b.fSize}px ${FONTS.display}`;
      const m = tmp.measureText(b.label || "");
      const tw = Math.ceil(m.width) + pad * 2;
      const th = Math.ceil(b.fSize * 1.4) + pad * 2;
      const ascent = m.actualBoundingBoxAscent || b.fSize * 0.4;
      const descent = m.actualBoundingBoxDescent || b.fSize * 0.1;
      const yOff = (ascent - descent) / 2;
      const c = document.createElement("canvas");
      c.width = tw * 2;
      c.height = th * 2;
      const lctx = c.getContext("2d");
      lctx.scale(2, 2);
      // No blur — crisp text (2× supersample keeps it sharp on the downscale).
      lctx.font = `${b.fontW} ${b.fSize}px ${FONTS.display}`;
      lctx.textAlign = "center";
      lctx.fillStyle = COLORS.bg;
      lctx.fillText(b.label || "", tw / 2, th / 2 + yOff);
      caches.push({ canvas: c, w: tw, h: th });
    }
    labelCachesRef.current = caches;
  };

  // Re-resolve identity (labels + colors + slots) whenever the viewer context
  // changes, then rebuild the (font-dependent) label bitmaps.
  useEffect(() => {
    ensureFonts();
    const balls = ballsRef.current;
    for (const b of balls) {
      const id = resolveIdentity(b, ctx);
      b.label = id.label;
      b.color = id.color;
      b.slot = id.slot;
    }
    buildLabelCaches();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildLabelCaches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  // ── Canvas sizing (DPR-aware). Canvas spans the whole stage; origin sits in the
  // bottom-right corner so the resting cluster lives there. ──
  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth || HIT_W;
    const H = canvas.clientHeight || HIT_H;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    const ctx2d = canvas.getContext("2d");
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    dimsRef.current = { W, H, dpr };
    originRef.current = { x: W - 88, y: H - 108 };
    parkRef.current = { x: W - 88, y: H - 268 };
  };

  // hit-test in canvas (screen) coords, front-to-back.
  const hitTest = (mx, my) => {
    const balls = ballsRef.current;
    const order = balls.map((b, i) => ({ i, z: b.z })).sort((a, b) => b.z - a.z);
    for (const s of order) {
      const b = balls[s.i];
      if (Math.hypot(mx - b.x, my - b.y) < b.r + 12) return s.i;
    }
    return -1;
  };
  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ── Pointer input (on the corner hit region; pointer-capture tracks globally) ──
  const onPointerDown = (e) => {
    if (paused) return;
    const p = getPos(e);
    const hit = hitTest(p.x, p.y);
    if (hit < 0) return; // empty corner → let the gesture pass through
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    mouseRef.current = p;
    dragRef.current = { ball: hit, hasMoved: false, startX: p.x, startY: p.y, offEdge: false };
    ballsRef.current[hit].dragging = true;
  };
  // Edge zone for the "fling off-screen → clear filter" gesture. Generous, and
  // tracked during the whole drag, because on touch the finger can't actually
  // leave the viewport (and a release at the very edge often isn't precise).
  const OFF_EDGE = 44;
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (d.ball < 0) return;
    const p = getPos(e);
    mouseRef.current = p;
    if (Math.hypot(p.x - d.startX, p.y - d.startY) > 5) d.hasMoved = true;
    // Approaching the left/top edge (away from the dock) arms the off-screen reset.
    if (p.x < OFF_EDGE || p.y < OFF_EDGE) d.offEdge = true;
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (d.ball < 0) return;
    const balls = ballsRef.current;
    const b = balls[d.ball];
    const origin = originRef.current;
    const { W, H } = dimsRef.current;
    const { onCreate, onGrownUp, onFilter } = cbRef.current;
    const active = laneFilterRef.current;
    const p = getPos(e);
    // Off-screen if the drag reached the left/top edge zone at any point (sticky,
    // for touch) or the pointer ended beyond any edge (desktop).
    const offscreen = d.offEdge || p.x < OFF_EDGE || p.y < OFF_EDGE || p.x > W + 4 || p.y > H + 4;
    if (!d.hasMoved) {
      // ── TAP ──
      if (b.role === "spark") onGrownUp && onGrownUp();
      else if (b.slot && active === b.slot) onFilter && onFilter("all"); // tap the parked orb clears
      else onCreate && onCreate(b.slot);
      b.activated = 1;
    } else if (offscreen) {
      // ── DRAG off-screen: reset to all (any orb) ──
      if (active !== "all") onFilter && onFilter("all");
    } else if (b.role !== "spark" && b.slot) {
      // ── DRAG release: latch toward centre / clear back to corner ──
      const cornerToCentre = Math.hypot(origin.x - W / 2, origin.y - H / 2) || 1;
      const distOrigin = Math.hypot(b.x - origin.x, b.y - origin.y);
      if (active === b.slot) {
        if (distOrigin < CLEAR_FRAC * cornerToCentre) onFilter && onFilter("all");
      } else if (distOrigin > LATCH_FRAC * cornerToCentre) {
        onFilter && onFilter(b.slot);
      }
      // otherwise springs back (no change).
    }
    b.dragging = false;
    d.ball = -1;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  // ── Main engine: canvas + rAF loop. Mount-only (re-runs on reducedMotion). ──
  useEffect(() => {
    if (reducedMotion) return; // static DOM fallback renders instead
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
    offCanvasRef.current = document.createElement("canvas");
    const offCanvas = offCanvasRef.current;
    const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

    resize();
    const origin0 = originRef.current;
    for (const b of ballsRef.current) {
      const p = orbitPos(b.angle, b.orbitR);
      b.x = origin0.x + p.dx;
      b.y = origin0.y + p.dy;
      b.z = p.z;
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // ── field render — transparent compositing, bbox-local offscreen ──
    const renderMetaballs = () => {
      const { W, H, dpr } = dimsRef.current;
      const balls = ballsRef.current;
      const N = balls.length;

      let maxR = 0;
      for (let i = 0; i < N; i++) if (balls[i].r > maxR) maxR = balls[i].r;
      const pad = maxR * 1.6; // field only reaches ~1.1× radius; keep the bbox tight for sharpness
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < N; i++) {
        const b = balls[i];
        if (b.x < minX) minX = b.x;
        if (b.x > maxX) maxX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.y > maxY) maxY = b.y;
      }
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(W, maxX + pad); maxY = Math.min(H, maxY + pad);
      const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
      // Render at device-pixel sharpness (scale up to dpr), but cap total pixels.
      const scale = Math.max(0.6, Math.min(dpr, Math.sqrt(OFF_BUDGET / (bw * bh))));
      const sw = Math.max(1, Math.floor(bw * scale)), sh = Math.max(1, Math.floor(bh * scale));
      if (offCanvas.width !== sw) offCanvas.width = sw;
      if (offCanvas.height !== sh) offCanvas.height = sh;
      const img = offCtx.createImageData(sw, sh);
      const d = img.data;

      const bd = new Array(N);
      for (let i = 0; i < N; i++) {
        const b = balls[i];
        const boost = b.activated * 0.4;
        const depthF = 1 + b.z * DEPTH_BRIGHT * 0.01;
        bd[i] = {
          cx: (b.x - minX) * scale, cy: (b.y - minY) * scale,
          r2: (b.r * scale) * (b.r * scale),
          cr: Math.min(255, (b.color.r + boost * 55) * depthF),
          cg: Math.min(255, (b.color.g + boost * 40) * depthF),
          cb: Math.min(255, (b.color.b + boost * 30) * depthF),
        };
      }

      // Opaque body, anti-aliased only on the outer rim [THR-EDGE, THR]; above THR
      // the orb is fully solid. alpha is for edge smoothing, not see-through.
      const lo = THR - EDGE, invRange = 1 / EDGE;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          let field = 0, wr = 0, wg = 0, wb = 0;
          for (let i = 0; i < N; i++) {
            const dx = x - bd[i].cx, dy = y - bd[i].cy;
            const c = bd[i].r2 / (dx * dx + dy * dy + 1);
            field += c;
            wr += bd[i].cr * c; wg += bd[i].cg * c; wb += bd[i].cb * c;
          }
          if (field < lo) continue;
          let alpha;
          if (field >= THR) alpha = 1;
          else { const t = (field - lo) * invRange; alpha = t * t * (3 - 2 * t); }
          const invF = 1 / field;
          const idx = (y * sw + x) * 4;
          d[idx] = (wr * invF) | 0;
          d[idx + 1] = (wg * invF) | 0;
          d[idx + 2] = (wb * invF) | 0;
          d[idx + 3] = (alpha * 255) | 0;
        }
      }
      offCtx.putImageData(img, 0, 0);
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = "high";
      ctx2d.drawImage(offCanvas, 0, 0, sw, sh, minX, minY, bw, bh);
    };

    const drawGlow = () => {
      const balls = ballsRef.current;
      for (const b of balls) {
        if (b.activated < 0.01) continue;
        const grad = ctx2d.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r * 3);
        grad.addColorStop(0, `rgba(${b.color.r},${b.color.g},${b.color.b},${b.activated * 0.25})`);
        grad.addColorStop(1, `rgba(${b.color.r},${b.color.g},${b.color.b},0)`);
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
        ctx2d.fill();
      }
    };

    const drawLabels = (order) => {
      const balls = ballsRef.current;
      const caches = labelCachesRef.current;
      // Front-most first: a front label "wins", and any back label it would touch
      // is hidden (with a short fade band) so text never collides.
      const front = order.slice().reverse();
      const placed = [];
      const FADE = 12; // px of clear separation needed for a label to fully show
      for (const idx of front) {
        const b = balls[idx];
        const cache = caches[idx];
        if (!cache) continue;
        const tw = cache.w - 8, th = cache.h - 6; // visible text extent
        let vis = 1;
        for (const q of placed) {
          const reqX = (tw + q.tw) / 2;
          const reqY = (th + q.th) / 2;
          // separation beyond the boxes touching (negative ⇒ overlapping)
          const sep = Math.max(Math.abs(b.x - q.x) - reqX, Math.abs(b.y - q.y) - reqY);
          vis = Math.min(vis, Math.max(0, Math.min(1, sep / FADE)));
        }
        const depthAlpha = 0.72 + 0.28 * Math.max(0, Math.min(1, (b.z + 60) / 120));
        const baseAlpha = (0.85 + b.activated * 0.15) * depthAlpha * vis;
        if (baseAlpha < 0.05) continue; // hidden by an overlapping front label
        ctx2d.save();
        ctx2d.globalAlpha = baseAlpha;
        if (b.role === "spark") {
          ctx2d.translate(b.x, b.y);
          ctx2d.rotate(b.spinAngle || 0);
          ctx2d.drawImage(cache.canvas, -cache.w / 2, -cache.h / 2, cache.w, cache.h);
        } else {
          ctx2d.drawImage(cache.canvas, Math.round(b.x - cache.w / 2), Math.round(b.y - cache.h / 2), cache.w, cache.h);
        }
        ctx2d.restore();
        placed.push({ x: b.x, y: b.y, tw, th });
      }
    };

    // ── loop ──
    let lastT = performance.now();
    let burstBall = -1;
    let burstTimer = 3 + Math.random() * 5;
    let burstDuration = 0;
    let time = 0;

    const step = (now) => {
      const halted = pausedRef.current || docHiddenRef.current || offscreenRef.current;
      if (halted) { rafRef.current = 0; return; } // resumed by the effects below
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      time += dt;

      const balls = ballsRef.current;
      const N = balls.length;
      const origin = originRef.current;
      const park = parkRef.current;
      const mouse = mouseRef.current;
      const { W, H } = dimsRef.current;
      const active = laneFilterRef.current;
      const cornerToCentre = Math.hypot(origin.x - W / 2, origin.y - H / 2) || 1;

      // breathing — layered sines (scaled amplitudes)
      for (let i = 0; i < N; i++) {
        const b = balls[i];
        const osc1 = Math.sin(time * 0.18 + b.phaseOffset) * 5;
        const osc2 = Math.sin(time * 0.065 + b.phaseOffset * 1.7) * 9;
        const osc3 = Math.sin(time * 0.03 + b.phaseOffset * 0.6) * 6;
        b.orbitR = Math.max(16, b.baseOrbitR + osc1 + osc2 + osc3); // floor keeps them from collapsing into one blob
      }

      // speed burst
      burstTimer -= dt;
      if (burstTimer <= 0 && burstBall === -1) {
        burstBall = (Math.random() * N) | 0;
        burstDuration = 1.2 + Math.random() * 1.5;
        burstTimer = 0;
      }
      if (burstBall >= 0) {
        burstDuration -= dt;
        const burstT = Math.sin(Math.max(0, 1 - burstDuration / 2.0) * Math.PI);
        balls[burstBall].speed = balls[burstBall].baseSpeed * (1 + (BURST_MULT - 1) * burstT);
        if (burstDuration <= 0) {
          balls[burstBall].speed = balls[burstBall].baseSpeed;
          burstBall = -1;
          burstTimer = 4 + Math.random() * 8;
        }
      }

      // orbit physics + inter-ball gravity
      let dragIdx = -1;
      for (let i = 0; i < N; i++) if (balls[i].dragging) dragIdx = i;

      for (let i = 0; i < N; i++) {
        const b = balls[i];
        b.angle += b.speed * dt;
        b.activated *= Math.pow(0.02, dt);
        const parked = active && active !== "all" && b.slot === active;
        if (parked && !b.dragging) b.activated = Math.max(b.activated, 0.6); // steady active glow

        if (b.dragging) {
          // Anchor the finger at the orb's bottom-right so the body stays visible
          // up-left of the thumb.
          const off = b.baseR * DRAG_ANCHOR;
          b.x += (mouse.x - off - b.x) * 14 * dt;
          b.y += (mouse.y - off - b.y) * 14 * dt;
          b.z = 0;
          b.angle = Math.atan2(-(b.y - origin.y) / sinTilt, b.x - origin.x);
          // arm feedback: a lane orb dragged past the latch glows to signal it'll filter
          if (b.slot && Math.hypot(b.x - origin.x, b.y - origin.y) > LATCH_FRAC * cornerToCentre) {
            b.activated = Math.max(b.activated, 0.85);
          }
        } else if (parked) {
          // active-filter orb parks above the cluster as the indicator.
          b.x += (park.x - b.x) * 6 * dt;
          b.y += (park.y - b.y) * 6 * dt;
          b.z = 0;
        } else {
          const p = orbitPos(b.angle, b.orbitR);
          let tx = origin.x + p.dx, ty = origin.y + p.dy;
          b.z = p.z;
          for (let j = 0; j < N; j++) {
            if (j === i || j === dragIdx) continue;
            const o = balls[j];
            const dx = o.x - b.x, dy = o.y - b.y;
            const dist = Math.max(MIN_DIST, Math.hypot(dx, dy));
            const force = GRAV / (dist * dist);
            tx += (dx / dist) * force; ty += (dy / dist) * force;
          }
          if (dragIdx >= 0) {
            let closestDist = Infinity, closestIdx = -1;
            for (let j = 0; j < N; j++) {
              if (j === dragIdx || balls[j].dragging) continue;
              const dd = Math.hypot(balls[dragIdx].x - balls[j].x, balls[dragIdx].y - balls[j].y);
              if (dd < closestDist) { closestDist = dd; closestIdx = j; }
            }
            if (i === closestIdx) {
              const dr = balls[dragIdx];
              const dx = dr.x - b.x, dy = dr.y - b.y;
              const dist = Math.hypot(dx, dy);
              const pull = Math.min(0.22, 22 / (dist + 50));
              tx = tx * (1 - pull) + dr.x * pull;
              ty = ty * (1 - pull) + dr.y * pull;
            }
          }
          b.x += (tx - b.x) * 6 * dt;
          b.y += (ty - b.y) * 6 * dt;
        }
        b.r = b.baseR * (1 + b.z * DEPTH_SCALE);
      }

      // sparkle proximity-spin (also the §12 adjacency signal)
      const sparkle = balls[1];
      let proximity = 0;
      for (let j = 0; j < N; j++) {
        if (j === 1) continue;
        const dd = Math.hypot(sparkle.x - balls[j].x, sparkle.y - balls[j].y);
        proximity += Math.max(0, 1 - dd / PROX_DIST);
      }
      sparkle.spinAngle = (sparkle.spinAngle || 0) + proximity * 2.2 * dt;

      const order = balls.map((_, i) => i).sort((a, b) => balls[a].z - balls[b].z);
      ctx2d.clearRect(0, 0, W, H);
      drawGlow();
      renderMetaballs();
      drawLabels(order);

      rafRef.current = requestAnimationFrame(step);
    };

    startLoopRef.current = () => {
      if (rafRef.current) return;
      lastT = performance.now();
      rafRef.current = requestAnimationFrame(step);
    };
    startLoopRef.current();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      startLoopRef.current = null;
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // ── Pause/resume sources: overlay (paused prop), tab hidden, off-screen ──
  useEffect(() => {
    if (reducedMotion) return;
    const onVis = () => {
      docHiddenRef.current = document.hidden;
      if (!document.hidden) startLoopRef.current && startLoopRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    let io;
    if (wrapRef.current && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        ([e]) => {
          offscreenRef.current = !e.isIntersecting;
          if (e.isIntersecting) startLoopRef.current && startLoopRef.current();
        },
        { threshold: 0 }
      );
      io.observe(wrapRef.current);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (io) io.disconnect();
    };
  }, [reducedMotion]);

  // Resume when the overlay closes (paused prop flips back to false).
  useEffect(() => {
    if (reducedMotion) return;
    if (!paused) startLoopRef.current && startLoopRef.current();
  }, [paused, reducedMotion]);

  // ── Reduced-motion static fallback: real buttons + the lane-filter row ──
  if (reducedMotion) {
    const viewer = ctx?.viewerSlot || SLOTS.A;
    const other = viewer === SLOTS.A ? SLOTS.B : SLOTS.A;
    const lanes = [
      { slot: viewer, label: laneLabel(viewer, viewer, ctx?.space), color: ctx ? laneColor(viewer, ctx.people, COLORS) : COLORS.laneMe },
      { slot: other, label: laneLabel(other, viewer, ctx?.space), color: ctx ? laneColor(other, ctx.people, COLORS) : COLORS.laneYou },
      { slot: SLOTS.SHARED, label: laneLabel(SLOTS.SHARED, viewer, ctx?.space), color: COLORS.laneUs },
    ];
    return (
      <div style={{ position: "absolute", right: 12, bottom: 12, zIndex: 7, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, opacity: paused ? 0 : 1, pointerEvents: paused ? "none" : "auto", transition: "opacity 200ms ease" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {lanes.map((l) => (
            <button
              key={l.slot}
              onClick={() => onCreate && onCreate(l.slot)}
              aria-label={`Add to ${l.label}`}
              className="pressable focusable"
              style={{ width: 48, height: 48, borderRadius: 24, border: "none", cursor: "pointer", background: l.color, color: COLORS.bg, fontFamily: FONTS.display, fontWeight: 600, fontSize: 14 }}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => onGrownUp && onGrownUp()}
            aria-label="Open The Grown-Up"
            className="pressable focusable"
            style={{ width: 48, height: 48, borderRadius: 24, border: `1px solid ${COLORS.accentGlow}`, cursor: "pointer", background: `rgb(${SPARK_RGB.r},${SPARK_RGB.g},${SPARK_RGB.b})`, color: COLORS.bg, fontFamily: FONTS.display, fontWeight: 600, fontSize: 16 }}
          >
            ✦
          </button>
        </div>
        <LaneFilter value={laneFilter} onChange={onFilter} ctx={ctx} style={{ background: "transparent", padding: 0 }} />
      </div>
    );
  }

  // ── Animated path: a full-stage render canvas + a corner pointer-catch region ──
  const viewer = ctx?.viewerSlot || SLOTS.A;
  const other = viewer === SLOTS.A ? SLOTS.B : SLOTS.A;
  const srOnly = { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };
  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 7,
        pointerEvents: "none", // canvas never blocks the views
        opacity: paused ? 0 : 1,
        transition: "opacity 200ms ease",
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }} />
      {/* Corner pointer-catch region (initiates taps/drags; pointer-capture then
          tracks the drag across the whole stage). */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: HIT_W,
          height: HIT_H,
          touchAction: "none",
          pointerEvents: paused ? "none" : "auto",
        }}
      />
      {/* Real controls for assistive tech (canvas is aria-hidden). */}
      <div style={srOnly}>
        <button onClick={() => onCreate && onCreate(viewer)}>Add to {laneLabel(viewer, viewer, ctx?.space)}</button>
        <button onClick={() => onCreate && onCreate(other)}>Add to {laneLabel(other, viewer, ctx?.space)}</button>
        <button onClick={() => onCreate && onCreate(SLOTS.SHARED)}>Add to {laneLabel(SLOTS.SHARED, viewer, ctx?.space)}</button>
        <button onClick={() => onGrownUp && onGrownUp()}>Open The Grown-Up</button>
        {laneFilter !== "all" && <button onClick={() => onFilter && onFilter("all")}>Show all lanes</button>}
      </div>
    </div>
  );
}
