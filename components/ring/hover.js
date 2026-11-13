import { chase, clamp01, smoothstep } from "./utils";

// Adapted from the upstream cursor: anchors stay in each card's local space.
export function createHover(params, uniforms, wordSheet, pointer) {
  const bead = {
    on: false,
    r: 0,
    hw: 0,
    tx: 0,
    ty: 0,
    word: 0,
    card: -1,
    from: -1,
    ax: 0,
    ay: 0,
    s: 0,
  };
  // A thread starts where the head left the card: the nearest point to it
  // a little way inside the card's rounded edge, deep enough to bury the
  // thread's square end, kept in the card's own units so it stays on that
  // spot while the card turns and swells.
  const pullFrom = (i, W, H) => {
    const c = uniforms.uPos.value[i];
    const rot = uniforms.uRot.value[i];
    const sc = uniforms.uScale.value[i];
    const hw = W * 0.5 * sc.x;
    const hh = H * 0.5 * sc.y;
    const bury = params.beadSize * 0.5;
    if (hw <= bury || hh <= bury) return;
    const qx = pointer.x - c.x;
    const qy = pointer.y - c.y;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    let lx = qx * cr + qy * sr;
    let ly = -qx * sr + qy * cr;
    // Clamped to the core of the shrunken box, then no further from it
    // than the shrunken corner reaches.
    const rr = Math.min(uniforms.uRadius.value, hw, hh);
    const core = Math.max(rr, bury);
    const kx = Math.max(-(hw - core), Math.min(hw - core, lx));
    const ky = Math.max(-(hh - core), Math.min(hh - core, ly));
    let ox = lx - kx;
    let oy = ly - ky;
    const ol = Math.hypot(ox, oy);
    const reach = Math.max(0, rr - bury);
    if (ol > reach) {
      ox *= reach / ol;
      oy *= reach / ol;
    }
    lx = kx + ox;
    ly = ky + oy;
    bead.from = i;
    bead.ax = lx / hw;
    bead.ay = ly / hh;
    bead.s = 1;
  };
  let wordKey = "";
  const update = ({
    dt,
    coarse,
    active,
    interactive,
    dragging,
    over,
    count,
    W,
    H,
    reduced,
  }) => {
    const nextKey = `${params.tagText}/${params.wordSize}/${params.nameFont}`;
    if (wordKey !== nextKey) {
      wordSheet.build();
      wordKey = nextKey;
    }
    const mouse = !coarse && !active && interactive;
    if (mouse !== bead.on) {
      bead.on = mouse;
    }
    const word =
      mouse && pointer.inside && !dragging && interactive && over >= 0;
    const sunk = word ? over : -1;
    if (sunk !== bead.card) {
      if (!reduced && bead.card >= 0 && !active) pullFrom(bead.card, W, H);
      bead.card = sunk;
    }
    const present = mouse && pointer.inside && pointer.seeded;
    const drop = present && !word;
    // Approach the pill monotonically, matching the preview’s calm motion.

    const rTo = !present ? 0 : word ? params.beadPillH : params.beadSize * 0.5;
    const wTo = word
      ? Math.max(rTo, wordSheet.width * 0.5 + params.beadPillPad)
      : rTo;
    const response = reduced ? 1 : chase(dt, 0.22);
    bead.r += (rTo - bead.r) * response;
    bead.hw += (wTo - bead.hw) * response;
    // Near a card the drop reaches for it: the tail is drawn toward the
    // nearest point of the card's edge, so the drop leans over and, close
    // enough, touches and melts into the card before the head is over it.
    let aimX = pointer.x;
    let aimY = pointer.y;
    if (!reduced && drop && params.beadReach > 0) {
      let best = params.beadReach;
      for (let i = 0; i < count; i++) {
        const sc = uniforms.uScale.value[i];
        const hw = W * 0.5 * sc.x;
        const hh = H * 0.5 * sc.y;
        if (hw < 1 || hh < 1) continue;
        const c = uniforms.uPos.value[i];
        const rot = uniforms.uRot.value[i];
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);
        const qx = pointer.x - c.x;
        const qy = pointer.y - c.y;
        const lx = qx * cr + qy * sr;
        const ly = -qx * sr + qy * cr;
        const rr = Math.min(uniforms.uRadius.value, hw, hh);
        const ox = Math.max(Math.abs(lx) - (hw - rr), 0);
        const oy = Math.max(Math.abs(ly) - (hh - rr), 0);
        const ol = Math.hypot(ox, oy);
        const gap = ol - rr;
        if (gap <= 0 || gap >= best) continue;
        best = gap;
        // Back along the edge's outward normal, turned into the world.
        const nx = (-Math.sign(lx) * ox) / ol;
        const ny = (-Math.sign(ly) * oy) / ol;
        const k = smoothstep(params.beadReach, params.beadReach * 0.2, gap);
        const len = Math.min(gap, bead.r * params.beadStretch) * k;
        aimX = pointer.x + (nx * cr - ny * sr) * len;
        aimY = pointer.y + (nx * sr + ny * cr) * len;
      }
    }
    // The tail trails its aim — the head, or that edge — and never further
    // than the drop stretches past its own rim; with no drop it sits on the
    // head, so one re-forms as a circle.
    const kt = reduced ? 1 : chase(dt, params.beadLag);
    bead.tx += (aimX - bead.tx) * kt;
    bead.ty += (aimY - bead.ty) * kt;
    {
      const dx = bead.tx - pointer.x;
      const dy = bead.ty - pointer.y;
      const dl = Math.hypot(dx, dy);
      const most =
        Math.max(bead.r, bead.hw) + bead.r * (params.beadStretch - 1);
      if (dl > most) {
        const k = most / dl;
        bead.tx = pointer.x + dx * k;
        bead.ty = pointer.y + dy * k;
      }
    }
    uniforms.uBead.value.set(pointer.x, pointer.y, bead.tx, bead.ty);
    uniforms.uBeadR.value.set(
      bead.r,
      bead.r * params.beadTail,
      params.beadMelt,
      params.blend,
    );
    // The word comes through as the pill opens and closes up quicker.
    bead.word += ((word ? 1 : 0) - bead.word) * chase(dt, word ? 0.12 : 0.3);
    const wa = bead.word * bead.word * (3 - 2 * bead.word);
    const bl = uniforms.uBeadL.value;
    bl.x = wa;
    bl.y = Math.max(bead.hw, bead.r);

    // The thread, fixed to the spot on the card it came out of and drawn
    // out to the head. It thins with time and faster with stretch, pinches
    // in the middle as it goes, and once it is too thin to hold it lets go
    // all at once. Only on the ring; an open takes it with the bead.
    const bt = uniforms.uBeadT.value;
    bt.z = bt.w = -100;
    if (bead.s > 0 && bead.from >= 0 && bead.from < count && !active) {
      const c = uniforms.uPos.value[bead.from];
      const rot = uniforms.uRot.value[bead.from];
      const sc = uniforms.uScale.value[bead.from];
      const lx = bead.ax * W * 0.5 * sc.x;
      const ly = bead.ay * H * 0.5 * sc.y;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      bt.x = c.x + lx * cr - ly * sr;
      bt.y = c.y + lx * sr + ly * cr;
      const len = Math.hypot(pointer.x - bt.x, pointer.y - bt.y);
      const stretch = clamp01(len / Math.max(1, params.beadSnap));
      const hold = bead.s * (1 - stretch * stretch);

      bead.s = Math.max(
        0,
        bead.s - dt * (hold < 0.2 ? 6 : 1 / Math.max(0.05, params.beadHold)),
      );
      const w = bead.s * (1 - stretch * stretch);
      const r0 = Math.min(bead.r * 0.85, params.beadSize * 0.42 * w);
      bt.z = r0 - params.dissolve * (1 - w);
      bt.w = bt.z * (1 - (1 - params.pinch) * smoothstep(0, 0.6, stretch));
      bl.z = params.sag * stretch;
      bl.w = Math.min(params.beadMelt * 0.5, Math.max(r0, 0) * 1.5);
    } else {
      bead.s = 0;
    }
    return mouse && present;
  };
  return { update };
}
