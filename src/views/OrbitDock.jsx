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
//   • Drag a lane orb out past the latch → onFilter(laneSlot); it parks as the
//     active-filter indicator. Tap / drag the parked orb back → onFilter("all").
//   • Drag the ✦ orb   → springs back, no effect in v1 (reserved, see doc §12).
// Engine state lives in refs (never React state) so the rAF loop never re-renders.

// Region (a fixed box pinned bottom-right; canvas is transparent so only orbs show)
const DOCK_W = 200;
const DOCK_H = 210;

// ── Engine tunables (scaled down from the full-window prototype for this dock) ──
const RES = 0.5; // offscreen field scale; bilinear-upscaled to display
const TILT = Math.PI * 0.38;
const cosTilt = Math.cos(TILT);
const sinTilt = Math.sin(TILT);
const DEPTH_SCALE = 0.0025; // z → ball size
const DEPTH_BRIGHT = 0.1; // z → field brightness
const THR = 1.0; // merge threshold
const EDGE = 0.15; // anti-alias half-band
const GRAV = 1500; // ambient inter-ball pull
const MIN_DIST = 18; // gravity softening
const BURST_MULT = 2.6; // speed-burst multiplier
const PROX_DIST = 90; // sparkle proximity-spin falloff
const LATCH_RADIUS = 72; // drag-out distance that latches a filter
const CLEAR_RADIUS = 52; // drag a parked orb back inside this → clear filter

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
  return [
    { role: "us",    slot: SLOTS.SHARED, angle: 0,              baseOrbitR: 38, orbitR: 38, speed: 0.4,  baseSpeed: 0.4,  baseR: 22, r: 22, fSize: 15, fontW: "600", phaseOffset: 0,   x: 0, y: 0, z: 0, dragging: false, activated: 0 },
    { role: "spark", slot: null,         angle: Math.PI * 0.55, baseOrbitR: 44, orbitR: 44, speed: 0.38, baseSpeed: 0.38, baseR: 16, r: 16, fSize: 16, fontW: "600", phaseOffset: 1.3, x: 0, y: 0, z: 0, dragging: false, activated: 0, spinAngle: 0 },
    { role: "me",    slot: null,         angle: Math.PI,        baseOrbitR: 41, orbitR: 41, speed: 0.42, baseSpeed: 0.42, baseR: 20, r: 20, fSize: 15, fontW: "600", phaseOffset: 2.7, x: 0, y: 0, z: 0, dragging: false, activated: 0 },
    { role: "you",   slot: null,         angle: Math.PI * 1.5,  baseOrbitR: 47, orbitR: 47, speed: 0.36, baseSpeed: 0.36, baseR: 19, r: 19, fSize: 14, fontW: "600", phaseOffset: 4.1, x: 0, y: 0, z: 0, dragging: false, activated: 0 },
  ];
}

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
  const label = ball.role === "us" ? laneLabel(SLOTS.SHARED, viewer, ctx?.space) : laneLabel(slot, viewer, ctx?.space);
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
  const originRef = useRef({ x: DOCK_W * 0.54, y: DOCK_H * 0.56 });
  const parkRef = useRef({ x: DOCK_W * 0.5, y: DOCK_H * 0.17 });
  const labelCachesRef = useRef([]);
  const rafRef = useRef(0);
  const dimsRef = useRef({ W: DOCK_W, H: DOCK_H, dpr: 1 });
  const flashRef = useRef(null);

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
      const pad = 12;
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
      lctx.filter = "blur(1.1px)";
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

  const offCanvasRef = useRef(null);
  const startLoopRef = useRef(null);

  // ── Canvas sizing (DPR-aware) ──
  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth || DOCK_W;
    const H = canvas.clientHeight || DOCK_H;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    const ctx2d = canvas.getContext("2d");
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    dimsRef.current = { W, H, dpr };
    originRef.current = { x: W * 0.54, y: H * 0.56 };
    parkRef.current = { x: W * 0.5, y: H * 0.17 };
    if (offCanvasRef.current) {
      offCanvasRef.current.width = Math.max(1, Math.floor(W * RES));
      offCanvasRef.current.height = Math.max(1, Math.floor(H * RES));
    }
  };

  // ── Main engine: canvas, listeners, rAF loop. Mount-only. ──
  useEffect(() => {
    if (reducedMotion) return; // static DOM fallback renders instead
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
    offCanvasRef.current = document.createElement("canvas");
    const offCanvas = offCanvasRef.current;
    const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

    resize();
    // Seed positions from the rest orbit.
    const origin = originRef.current;
    for (const b of ballsRef.current) {
      const p = orbitPos(b.angle, b.orbitR);
      b.x = origin.x + p.dx;
      b.y = origin.y + p.dy;
      b.z = p.z;
    }

    // ── pointer input ──
    let draggingBall = -1;
    let mouseDown = false;
    let hasMoved = false;
    const mouse = { x: 0, y: 0 };
    const mouseStart = { x: 0, y: 0 };

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? (e.touches[0] || e.changedTouches[0]) : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const hitTest = (mx, my) => {
      const balls = ballsRef.current;
      const order = balls.map((b, i) => ({ i, z: b.z })).sort((a, b) => b.z - a.z);
      for (const s of order) {
        const b = balls[s.i];
        if (Math.hypot(mx - b.x, my - b.y) < b.r + 10) return s.i;
      }
      return -1;
    };
    const flash = (color) => {
      const el = flashRef.current;
      if (!el) return;
      el.style.transition = "opacity 0.08s ease-out";
      el.style.background = `radial-gradient(circle at center, rgba(${color.r},${color.g},${color.b},0.18), transparent 70%)`;
      el.style.opacity = "1";
      setTimeout(() => { el.style.transition = "opacity 0.4s"; el.style.opacity = "0"; }, 60);
    };

    const onDown = (e) => {
      const p = getPos(e);
      const hit = hitTest(p.x, p.y);
      if (hit < 0) return; // empty-corner gestures pass through; orbs only
      e.preventDefault();
      mouse.x = p.x; mouse.y = p.y;
      mouseStart.x = p.x; mouseStart.y = p.y;
      mouseDown = true; hasMoved = false;
      draggingBall = hit; ballsRef.current[hit].dragging = true; canvas.style.cursor = "grabbing";
    };
    const onMove = (e) => {
      if (mouseDown) e.preventDefault();
      const p = getPos(e);
      mouse.x = p.x; mouse.y = p.y;
      if (mouseDown && Math.hypot(p.x - mouseStart.x, p.y - mouseStart.y) > 5) hasMoved = true;
      if (!mouseDown) canvas.style.cursor = hitTest(p.x, p.y) >= 0 ? "grab" : "default";
    };
    const onUp = () => {
      const balls = ballsRef.current;
      const origin2 = originRef.current;
      const { onCreate, onGrownUp, onFilter } = cbRef.current;
      if (draggingBall >= 0) {
        const b = balls[draggingBall];
        const active = laneFilterRef.current;
        if (!hasMoved) {
          // ── TAP ──
          if (b.role === "spark") onGrownUp && onGrownUp();
          else if (b.slot && active === b.slot) onFilter && onFilter("all"); // tap the parked orb clears
          else onCreate && onCreate(b.slot);
          b.activated = 1;
          flash(b.color);
        } else if (b.role !== "spark" && b.slot) {
          // ── DRAG release: latch / clear ──
          const dist = Math.hypot(b.x - origin2.x, b.y - origin2.y);
          if (active === b.slot) {
            if (dist < CLEAR_RADIUS) onFilter && onFilter("all"); // dragged the active orb home
          } else if (dist > LATCH_RADIUS) {
            onFilter && onFilter(b.slot); // pulled out past the latch
          }
        }
        // ✦ drag and short drags spring back on their own (no state change).
        b.dragging = false;
        draggingBall = -1;
      }
      mouseDown = false;
      canvas.style.cursor = hitTest(mouse.x, mouse.y) >= 0 ? "grab" : "default";
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // ── field render (transparent compositing — orbs float over the view) ──
    const renderMetaballs = () => {
      const { W, H } = dimsRef.current;
      const balls = ballsRef.current;
      const N = balls.length;
      const sw = offCanvas.width, sh = offCanvas.height;
      const img = offCtx.createImageData(sw, sh);
      const d = img.data;
      const active = laneFilterRef.current;
      const filtering = active && active !== "all";

      const bd = new Array(N);
      for (let i = 0; i < N; i++) {
        const b = balls[i];
        const boost = b.activated * 0.4;
        const depthF = 1 + b.z * DEPTH_BRIGHT * 0.01;
        // Dim the non-active lanes while a filter is parked.
        const dim = filtering && b.slot && b.slot !== active ? 0.55 : 1;
        bd[i] = {
          cx: b.x * RES, cy: b.y * RES,
          r2: (b.r * RES) * (b.r * RES),
          cr: Math.min(255, (b.color.r + boost * 55) * depthF),
          cg: Math.min(255, (b.color.g + boost * 40) * depthF),
          cb: Math.min(255, (b.color.b + boost * 30) * depthF),
          dim,
        };
      }

      let maxSR = 0;
      for (let i = 0; i < N; i++) { const sr = Math.sqrt(bd[i].r2); if (sr > maxSR) maxSR = sr; }
      const pad = maxSR * 4.5;
      let bxMin = Infinity, bxMax = -Infinity, byMin = Infinity, byMax = -Infinity;
      for (let i = 0; i < N; i++) {
        const c = bd[i];
        if (c.cx - pad < bxMin) bxMin = c.cx - pad;
        if (c.cx + pad > bxMax) bxMax = c.cx + pad;
        if (c.cy - pad < byMin) byMin = c.cy - pad;
        if (c.cy + pad > byMax) byMax = c.cy + pad;
      }
      const minX = Math.max(0, bxMin | 0);
      const maxX = Math.min(sw - 1, (bxMax + 1) | 0);
      const minY = Math.max(0, byMin | 0);
      const maxY = Math.min(sh - 1, (byMax + 1) | 0);

      const lo = THR - EDGE, hi = THR + EDGE, invRange = 1 / (hi - lo);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          let field = 0, wr = 0, wg = 0, wb = 0, wDim = 0;
          for (let i = 0; i < N; i++) {
            const dx = x - bd[i].cx, dy = y - bd[i].cy;
            const c = bd[i].r2 / (dx * dx + dy * dy + 1);
            field += c;
            wr += bd[i].cr * c; wg += bd[i].cg * c; wb += bd[i].cb * c;
            wDim += bd[i].dim * c;
          }
          if (field < lo) continue;
          let alpha;
          if (field >= hi) alpha = 1;
          else { const t = (field - lo) * invRange; alpha = t * t * (3 - 2 * t); }
          const invF = 1 / field;
          const idx = (y * sw + x) * 4;
          d[idx] = (wr * invF) | 0;
          d[idx + 1] = (wg * invF) | 0;
          d[idx + 2] = (wb * invF) | 0;
          d[idx + 3] = (alpha * (wDim * invF) * 255) | 0; // true alpha → floats over content
        }
      }
      offCtx.putImageData(img, 0, 0);
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = "high";
      ctx2d.drawImage(offCanvas, 0, 0, sw, sh, 0, 0, W, H);
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
      const active = laneFilterRef.current;
      const filtering = active && active !== "all";
      for (const idx of order) {
        const b = balls[idx];
        const cache = caches[idx];
        if (!cache) continue;
        const depthAlpha = 0.72 + 0.28 * Math.max(0, Math.min(1, (b.z + 60) / 120));
        const dim = filtering && b.slot && b.slot !== active ? 0.5 : 1;
        const baseAlpha = (0.85 + b.activated * 0.15) * depthAlpha * dim;
        ctx2d.save();
        ctx2d.globalAlpha = baseAlpha;
        if (b.role === "spark") {
          ctx2d.translate(b.x, b.y);
          ctx2d.rotate(b.spinAngle || 0);
          ctx2d.drawImage(cache.canvas, -cache.w / 2, -cache.h / 2, cache.w, cache.h);
        } else {
          ctx2d.drawImage(cache.canvas, b.x - cache.w / 2, b.y - cache.h / 2, cache.w, cache.h);
        }
        ctx2d.restore();
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
      if (halted) { rafRef.current = 0; return; } // resumed by the effect below
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      time += dt;

      const balls = ballsRef.current;
      const N = balls.length;
      const origin = originRef.current;
      const park = parkRef.current;
      const active = laneFilterRef.current;

      // breathing — layered sines (scaled amplitudes)
      for (let i = 0; i < N; i++) {
        const b = balls[i];
        const osc1 = Math.sin(time * 0.18 + b.phaseOffset) * 6;
        const osc2 = Math.sin(time * 0.065 + b.phaseOffset * 1.7) * 12;
        const osc3 = Math.sin(time * 0.03 + b.phaseOffset * 0.6) * 8;
        b.orbitR = Math.max(8, b.baseOrbitR + osc1 + osc2 + osc3);
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
          b.x += (mouse.x - b.x) * 12 * dt;
          b.y += (mouse.y - b.y) * 12 * dt;
          b.z = 0;
          b.angle = Math.atan2(-(b.y - origin.y) / sinTilt, b.x - origin.x);
        } else if (parked) {
          // The active-filter orb parks out of the cluster as the indicator.
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
      const { W, H } = dimsRef.current;
      ctx2d.clearRect(0, 0, W, H);
      drawGlow();
      renderMetaballs();
      drawLabels(order);

      rafRef.current = requestAnimationFrame(step);
    };

    // expose a starter the resume effect can call
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
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
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

  // ── Animated path: the canvas + a visually-hidden DOM control layer ──
  const viewer = ctx?.viewerSlot || SLOTS.A;
  const other = viewer === SLOTS.A ? SLOTS.B : SLOTS.A;
  const srOnly = { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };
  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        right: 6,
        bottom: 6,
        width: DOCK_W,
        height: DOCK_H,
        zIndex: 7,
        pointerEvents: "none",
        // While an overlay (drawer / capture sheet) is open the dock pauses; hide
        // it so it doesn't float above the scrim (scrim z5 < orbit z7).
        opacity: paused ? 0 : 1,
        transition: "opacity 200ms ease",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none", pointerEvents: paused ? "none" : "auto" }}
      />
      <div ref={flashRef} aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }} />
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
