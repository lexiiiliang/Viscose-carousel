"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS } from "./ring/projects";

// Ring geometry — a flat 2D wheel in the screen plane, exactly as the original:
// cards sit on a circle (cos/sin) and each is turned to point radially outward.
// The circle's centre is pushed off one edge and the radius is large, so only a
// shallow arc shows, with one card facing front.
//
// The same wheel serves both compositions. In "horizontal" the centre is shoved
// off the LEFT, the front card lands at 3 o'clock (screen centre), neighbours
// arc above/below and the drag is vertical. In "vertical" the centre is shoved
// off the TOP, the front card lands at 6 o'clock (screen centre), neighbours fan
// out left/right like a splayed hand and the drag is horizontal. Only the axis
// differs; every constant, transition and animation is shared.
const COUNT = PROJECTS.length;
const STEP = 360 / COUNT; // degrees between neighbouring cards
// Radius of the wheel in px. Large relative to the viewport so the visible arc
// stays gentle. The centre is pushed off by exactly this, landing the front
// card at screen centre (see .ring transform below).
const RADIUS = 1150;

// A wheel gesture fires many small deltas; only step once it clears this.
// One mouse notch is ~100–120, so this keeps a notch to roughly one card.
const WHEEL_THRESHOLD = 100;
// px of drag that maps to one card, so a flick of the wrist turns the ring.
const DRAG_PER_CARD = 90;

const mod = (n, m) => ((n % m) + m) % m;
// Signed step count from `from` to `to` around the ring, choosing whichever
// direction is shorter (e.g. index 0 -> 17 on an 18-card ring is -1, not +17).
const shortestDelta = (from, to, count) => {
  const d = mod(to - from, count);
  return d > count / 2 ? d - count : d;
};

export default function SimpleCarousel({ orientation = "horizontal" }) {
  const vertical = orientation === "vertical";

  // The live rotation of the ring, in cards (not degrees) so it reads straight
  // off the index. Fractional while dragging, snapped back to whole on release.
  const [turn, setTurn] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(-1); // project index, -1 = closed

  // The card facing front. Rounded off turn so the meta and highlight follow
  // the ring even mid-drag.
  const index = mod(Math.round(turn), COUNT);
  const project = PROJECTS[index];

  const ringRef = useRef(null);
  const wheelAcc = useRef(0);
  // Drag bookkeeping, kept in a ref so the move handler is not rebuilt per frame.
  const drag = useRef({ active: false, startX: 0, startY: 0, startTurn: 0, moved: 0, captured: false, hitIndex: -1 });
  // Pending "centre then open" timer for clicks on off-centre cards.
  const openTimer = useRef(null);
  useEffect(() => () => clearTimeout(openTimer.current), []);

  const go = useCallback((delta) => {
    setTurn((t) => Math.round(t) + delta);
  }, []);

  /* ---------------------------------------------------------------- wheel */
  const onWheel = useCallback((e) => {
    if (lightbox >= 0) return;
    const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    // The vertical fan reads sideways, so its wheel runs opposite the
    // horizontal one — flip the sign for the vertical composition.
    const d = vertical ? -raw : raw;
    wheelAcc.current += d;
    while (Math.abs(wheelAcc.current) >= WHEEL_THRESHOLD) {
      const dir = Math.sign(wheelAcc.current);
      setTurn((t) => Math.round(t) + dir);
      wheelAcc.current -= dir * WHEEL_THRESHOLD;
    }
  }, [lightbox, vertical]);

  /* ----------------------------------------------------------------- drag */
  const onPointerDown = useCallback((e) => {
    if (lightbox >= 0) return;
    // Which card was pressed — read now, before any rotation moves the DOM.
    const cardEl = e.target.closest?.(".card");
    const hitIndex = cardEl ? Number(cardEl.dataset.i) : -1;
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTurn: turn,
      moved: 0,
      captured: false,
      hitIndex,
    };
    setDragging(true);
    // We handle tap-to-open in onPointerUp rather than a native onClick: a
    // pointer capture (needed for smooth dragging) retargets the click to the
    // stage, so a click handler on the card would never fire.
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current.captured = true;
    } catch {}
  }, [lightbox, turn]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current.active) return;
    // Horizontal composition travels vertically (neighbours sit above/below the
    // front card); vertical composition travels horizontally (neighbours fan out
    // to the sides). Dragging "away from" the next card carries it into centre.
    const d = vertical
      ? e.clientX - drag.current.startX
      : e.clientY - drag.current.startY;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(d));
    setTurn(drag.current.startTurn - d / DRAG_PER_CARD);
  }, [vertical]);

  const onPointerUp = useCallback((e) => {
    if (!drag.current.active) return;
    const { moved, hitIndex, startTurn } = drag.current;
    drag.current.active = false;
    setDragging(false);
    if (drag.current.captured) {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {}
    }

    // A drag: snap to the nearest slot and stop.
    if (moved >= 6) {
      setTurn((t) => Math.round(t));
      return;
    }

    // A tap. Snap back to where we started (no accidental fractional turn).
    setTurn(Math.round(startTurn));
    if (hitIndex < 0) return; // tapped empty space

    const startWhole = Math.round(startTurn);
    const front = hitIndex === mod(startWhole, COUNT);
    if (front) {
      setLightbox(hitIndex);
    } else {
      // Bring the tapped card round first, then open once it lands — turning
      // whichever way is shorter rather than snapping to the raw index.
      setTurn(startWhole + shortestDelta(mod(startWhole, COUNT), hitIndex, COUNT));
      setLightbox(-1);
      clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => setLightbox(hitIndex), 620);
    }
  }, []);

  /* ------------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return setLightbox(-1);
      if (lightbox >= 0) return;
      // Both arrow pairs step the ring, so the keys match either composition.
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
      if (e.key === "Enter" || e.key === " ") setLightbox(index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, lightbox]);

  const rotation = -turn * STEP;
  // The offset axis: push the wheel centre off the top for vertical, off the
  // left for horizontal, so the front card lands dead centre either way.
  const ringTransform = vertical
    ? `translateY(-${RADIUS}px) rotate(${rotation}deg)`
    : `translateX(-${RADIUS}px) rotate(${rotation}deg)`;

  return (
    <main className={`carousel-root${vertical ? " vertical" : ""}`}>
      {/* leading meta — number · name (left for horizontal, top for vertical) */}
      <div className={`meta ${vertical ? "meta-top" : "meta-left"}`} aria-hidden="true">
        <span className="meta-idx">{String(index + 1).padStart(2, "0")}</span>
        <span className="meta-name">{project.name}</span>
      </div>

      {/* trailing meta — type · year (right for horizontal, bottom for vertical) */}
      <div className={`meta ${vertical ? "meta-bottom" : "meta-right"}`} aria-hidden="true">
        <span className="meta-name">{project.type}</span>
        <span className="meta-idx">{project.year}</span>
      </div>

      <div
        className="stage"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div
          ref={ringRef}
          className="ring"
          style={{
            // The wheel's centre is pushed off by exactly one radius, so the
            // front card lands at screen centre and the rest curve away.
            transform: ringTransform,
            transition: dragging ? "none" : undefined,
          }}
        >
          {PROJECTS.map((p, i) => {
            const front = i === index;
            const cardTransform = vertical
              ? `rotate(${i * STEP}deg) translateY(${RADIUS}px)`
              : `rotate(${i * STEP}deg) translateX(${RADIUS}px)`;
            return (
              <figure
                key={p.file}
                data-i={i}
                className={`card${front ? " card-front" : ""}`}
                style={{
                  "--i": i,
                  // rotate then translate: the card sits at its slot on the
                  // circle and is turned radially, long edge pointing outward.
                  transform: cardTransform,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/${p.file}`} alt={p.name} draggable="false" />
              </figure>
            );
          })}
        </div>
      </div>

      {/* live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {project.name}, {project.type}, {project.year}
      </div>

      {/* lightbox */}
      {lightbox >= 0 && (
        <div
          className="lightbox"
          onClick={() => setLightbox(-1)}
          style={{ cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/${PROJECTS[lightbox].file}`} alt={PROJECTS[lightbox].name} />
        </div>
      )}
    </main>
  );
}
