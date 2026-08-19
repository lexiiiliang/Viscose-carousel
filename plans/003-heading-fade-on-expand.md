# 003 — Fade out the "Works '26" heading while the image is expanded

- **Status**: DONE
- **Commit**: 4b9ac8c
- **Severity**: MEDIUM
- **Category**: Cohesion & state indication
- **Estimated scope**: 2 files (`components/Carousel.jsx`, `components/ring/splitText.js`), ~20 lines

## Problem

The intro heading "Works '26" is rendered in the Three.js scene behind the ring. When the user opens a project image in the lightbox, the heading remains at full opacity and can visually compete with the expanded image. The requested behavior is for the heading to fade out whenever an image is expanded, then fade back in when the lightbox closes.

Current heading code (`components/ring/splitText.js:55`):

```js
const mat = new THREE.ShaderMaterial({
  vertexShader: textVertexShader,
  fragmentShader: textFragmentShader,
  uniforms: {
    uTex: { value: tex },
    uReveal: { value: 0 },
    uColor: { value: new THREE.Color(params.textColor) },
    uOpacity: { value: 1 },
  },
  transparent: true,
  depthTest: false,
  depthWrite: false,
});
```

`uOpacity` already exists, but nothing drives it after the entry timeline finishes.

## Target

- When the lightbox opens, tween every glyph's `uOpacity` from `1` to `0` over **300ms** with `power2.out`.
- When the lightbox closes, tween every glyph's `uOpacity` from `0` back to `1` over **350ms** with `power2.inOut`.
- The heading should remain invisible while the lightbox is fully open and only reappear once the close transition begins.
- If `prefers-reduced-motion` is active, skip the tween and set opacity directly.

## Repo conventions to follow

- The entry timeline already animates `splitText.fades` as an array of `uOpacity` uniforms (`components/Carousel.jsx:62` area). Use `gsap.to(splitText.fades, ...)` for consistency.
- The existing text reveal uses `power4.out` and `power2.in`; use `power2` family for the fade so it does not compete with the ring's motion.

## Steps

1. **Expose a heading opacity helper** in `components/ring/splitText.js` by adding a `setOpacity` method:
   ```js
   const setOpacity = (value) => {
     for (const uniform of fades) {
       if (uniform) uniform.value = value;
     }
   };
   ```
   Return it from the function:
   ```js
   return {
     build,
     dispose,
     setOpacity,
     get chars() { return chars; },
     get fades() { return fades; },
   };
   ```

2. **Add a heading-fade effect** in `components/Carousel.jsx` near the lightbox effects (`components/Carousel.jsx:62` area), watching `lightboxIndex` and `isClosing`:
   ```jsx
   useEffect(() => {
     if (!splitText.fades.length) return;
     const target = lightboxIndex !== null && !isClosing ? 0 : 1;
     gsap.killTweensOf(splitText.fades);
     gsap.to(splitText.fades, {
       value: target,
       duration: target === 0 ? 0.3 : 0.35,
       ease: target === 0 ? "power2.out" : "power2.inOut",
     });
   }, [lightboxIndex, isClosing]);
   ```

3. **Initialize heading opacity on build** so a mid-entry open does not pop: in `splitText.build()`, after creating `fades`, call `setOpacity(1)`.

## Boundaries

- Do NOT touch the text shaders (`components/shaders/textShaders.js`). `uOpacity` is already wired in.
- Do NOT change the entry timeline fade-out behavior. This plan only adds runtime opacity control after the entry finishes.
- Do NOT add new dependencies.

## Verification

- **Mechanical**:
  - `npm run build` succeeds.
  - `npm run lint` passes.
  - `npx prettier --check components/Carousel.jsx components/ring/splitText.js` passes.
- **Feel check** (run `npm run dev`, open `http://localhost:3000`):
  - Wait for the entry animation to finish and the "Works '26" heading to be visible.
  - Click a card to open the lightbox. The heading should fade out smoothly as the image expands.
  - Close the lightbox. The heading should fade back in.
  - Open the lightbox during the entry animation while the heading is still revealing. The heading should still fade out without glitching.
- **Done when**: the heading never overlaps or competes with an expanded project image.
