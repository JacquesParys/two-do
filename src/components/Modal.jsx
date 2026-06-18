import { useEffect, useRef, useState } from "react";
import { COLORS, RADIUS, SHADOW, MOTION } from "../theme";

// Accessible overlay wrapper shared by every modal/sheet/push-page.
// - role="dialog" + aria-modal, labelled by `title`
// - Esc to close, backdrop click to close (dismissible)
// - focus trap + focus restoration to the previously-focused element
// - body scroll-lock while open
// - enter/exit transition driven by `variant`:
//     center | sheet (slide up from bottom) | push (slide in from right)
//   exit is animated; onClose fires after the transition.
//
// Usage: <Modal title="Edit task" variant="push" onClose={fn}>…</Modal>
export default function Modal({
  title,
  variant = "center",
  onClose,
  dismissible = true,
  labelledBy,
  children,
  panelStyle,
  backdropStyle,
}) {
  const [shown, setShown] = useState(false);
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      setShown(true);
      // Move focus into the panel (first focusable, else the panel itself).
      const f = panelRef.current?.querySelector(
        'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])'
      );
      (f || panelRef.current)?.focus?.();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, []);

  function requestClose() {
    setShown(false);
    setTimeout(onClose, MOTION.base);
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && dismissible) {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Focus trap.
    const nodes = panelRef.current?.querySelectorAll(
      'input, textarea, select, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!nodes || nodes.length === 0) return;
    const list = Array.from(nodes);
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const align =
    variant === "sheet"
      ? { alignItems: "stretch", justifyContent: "flex-end" }
      : variant === "push"
      ? { alignItems: "stretch", justifyContent: "flex-end", padding: 0 }
      : { alignItems: "center", justifyContent: "center" };

  const hidden =
    variant === "sheet" ? "translateY(100%)"
    : variant === "push" ? "translateX(100%)"
    : "translateY(12px) scale(0.98)";
  const visible = variant === "center" ? "translateY(0) scale(1)" : "translate(0, 0)";

  const panelBase =
    variant === "sheet"
      ? { width: "100%", borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0` }
      : variant === "push"
      ? { width: "100%", maxWidth: 460, height: "100%", borderRadius: 0 }
      : { width: "100%", maxWidth: 460, maxHeight: "90%", borderRadius: RADIUS.xl };

  return (
    <div
      onKeyDown={onKeyDown}
      onClick={dismissible ? requestClose : undefined}
      style={{
        position: "absolute", inset: 0, zIndex: 40, display: "flex",
        background: "rgba(0,0,0,0.55)",
        opacity: shown ? 1 : 0,
        transition: `opacity ${MOTION.base}ms ${MOTION.ease}`,
        padding: variant === "center" ? 14 : 0,
        ...align,
        ...backdropStyle,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="motion"
        style={{
          display: "flex", flexDirection: "column",
          background: COLORS.bg, border: `1px solid ${COLORS.surfaceLight}`,
          boxShadow: SHADOW.lg, outline: "none",
          transform: shown ? visible : hidden,
          transition: `transform ${MOTION.base}ms ${MOTION.ease}`,
          ...panelBase,
          ...panelStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
