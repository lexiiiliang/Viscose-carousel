import { chase } from "./utils";

export function createHover(params, uniforms, wordSheet, pointer) {
  const bead = { r: 0, hw: 0, word: 0 };
  let wordKey = "";
  const update = ({
    dt,
    coarse,
    active,
    interactive,
    dragging,
    over,
    W,
    H,
    reduced,
  }) => {
    const nextKey = `${params.tagText}/${params.wordSize}/${params.nameFont}`;
    if (wordKey !== nextKey) {
      wordSheet.build();
      wordKey = nextKey;
    }
    const present =
      !coarse &&
      !active &&
      interactive &&
      !dragging &&
      pointer.inside &&
      pointer.seeded &&
      over >= 0;
    const response = reduced ? 1 : chase(dt, params.beadResponse);
    const rTo = present ? params.beadPillH : 0;
    const wTo = present
      ? Math.max(rTo, wordSheet.width * 0.5 + params.beadPillPad)
      : 0;
    bead.r += (rTo - bead.r) * response;
    bead.hw += (wTo - bead.hw) * response;
    bead.word += ((present ? 1 : 0) - bead.word) * response;
    // Leave no material behind the pointer when it exits the card.
    if (!present) bead.r = bead.hw = bead.word = 0;
    uniforms.uBead.value.set(pointer.x, pointer.y, 0, 0);
    const scale = over >= 0 ? uniforms.uScale.value[over] : null;
    uniforms.uBeadR.value.set(
      bead.r,
      over >= 0 ? uniforms.uRot.value[over] : 0,
      scale ? W * scale.x : 1,
      scale ? H * scale.y : 1,
    );
    uniforms.uBeadL.value.set(bead.word, Math.max(bead.hw, bead.r), 0, 0);
    uniforms.uBeadGlass.value.set(
      params.beadRefraction,
      params.beadTint,
      params.beadRim,
      params.beadHighlight,
    );
    return present;
  };
  return { update };
}
