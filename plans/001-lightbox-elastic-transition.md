# 001 — Add an elastic open/close transition to the image lightbox

- **Status**: DONE
- **Commit**: 4b9ac8c
- **Severity**: MEDIUM
- **Category**: Physicality & origin / Easing & duration
- **Estimated scope**: 1 file (`components/Carousel.jsx`), ~40 lines

## Problem

The lightbox added to `components/Carousel.jsx` currently appears and disappears instantly. Because the rest of the carousel is built from viscous, elastic WebGL motion (gooey plane unfurl, elastic cursor tag, springy hover lean), the hard cut of the lightbox feels detached and cheap. It also gives no click feedback — the user taps a card and the image simply replaces the scene.

Current code (`components/Carousel.jsx:1405`):

```jsx
{lightboxIndex !== null && (
  <div
    className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90"
    onClick={() => setLightboxIndex(null)}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={`/${PROJECTS[lightboxIndex].file}`}
      alt={PROJECTS[lightboxIndex].name}
      className="max-h-[92vh] max-w-[92vw] object-contain"
      onClick={(e) => {
        e.stopPropagation();
        setLightboxIndex(null);
      }}
    />
  </div>
)}
```

## Target

A two-phase GSAP-driven transition that matches the carousel's elastic, physical personality:

- **Backdrop**: fades from `opacity: 0` to `opacity: 1` in **350ms** with `power2.out`.
- **Image**: scales from `0.92` / `opacity: 0` to `1` / `opacity: 1` in **550ms** with `elastic.out(1, 0.7)`. This is the same elastic family previously used by the cursor tag (`elastic.out(1, 0.5)`), just slightly less bouncy because the image is large.
- **Exit**: image scales to `0.96` / `opacity: 0` and backdrop fades to `opacity: 0` in **250ms** with `power2.in`, then the component unmounts.
- The image is never `scale(0)`; it starts from a near-full size so it feels like it is bursting forward rather than appearing from nothing.
- **Click feedback**: immediately before the lightbox opens, the hovered card in the WebGL ring already gets a subtle swell. Leave that untouched; the new transition carries that momentum into the expanded view.
- **Interruptibility**: rapid open/close/open never leaves stale elements. Use a single GSAP timeline per phase and `gsap.killTweensOf` in cleanup.

## Repo conventions to follow

- GSAP is already the project's motion library. The cursor tag used `gsap.to(box, { sx: 1, duration: 0.62, ease: "elastic.out(1, 0.5)" })` (`components/ring/tag.js:65`). Imitate that pattern: store animated values in refs, run `gsap.killTweensOf` before new tweens, and use `gsap.timeline` for coordinated sequences.
- The project keeps React state minimal and avoids third-party animation wrappers. Implement the transition with `useEffect` + GSAP + local `isClosing` state, not Framer Motion or CSS keyframes.
- Tailwind v4 is used; keep the existing layout classes and only add inline styles for the initial animation state.

## Steps

1. **Add refs and a closing state** in `components/Carousel.jsx` near the lightbox state:
   ```jsx
   const [lightboxIndex, setLightboxIndex] = useState(null);
   const [isClosing, setIsClosing] = useState(false);
   const lightboxBackdropRef = useRef(null);
   const lightboxImageRef = useRef(null);
   ```

2. **Replace the instant close with a staged close**. Change `setLightboxIndex(null)` calls to call a new `closeLightbox` function:
   ```jsx
   const closeLightbox = () => {
     if (isClosing || lightboxIndex === null) return;
     setIsClosing(true);
   };
   ```
   Use `closeLightbox` in both `onClick` handlers on the lightbox overlay and image.

3. **Entrance animation effect**. Add an effect that runs when `lightboxIndex` is set but `isClosing` is false:
   ```jsx
   useEffect(() => {
     if (lightboxIndex === null || isClosing) return;
     const backdrop = lightboxBackdropRef.current;
     const image = lightboxImageRef.current;
     if (!backdrop || !image) return;

     gsap.killTweensOf([backdrop, image]);
     gsap.set(backdrop, { opacity: 0 });
     gsap.set(image, { scale: 0.92, opacity: 0 });

     const tl = gsap.timeline();
     tl.to(backdrop, { opacity: 1, duration: 0.35, ease: "power2.out" });
     tl.to(
       image,
       { scale: 1, opacity: 1, duration: 0.55, ease: "elastic.out(1, 0.7)" },
       0,
     );

     return () => {
       tl.kill();
       gsap.killTweensOf([backdrop, image]);
     };
   }, [lightboxIndex, isClosing]);
   ```

4. **Exit animation effect**. Add an effect that runs when `isClosing` becomes true:
   ```jsx
   useEffect(() => {
     if (!isClosing) return;
     const backdrop = lightboxBackdropRef.current;
     const image = lightboxImageRef.current;
     if (!backdrop || !image) return;

     gsap.killTweensOf([backdrop, image]);

     const tl = gsap.timeline({
       onComplete: () => {
         setLightboxIndex(null);
         setIsClosing(false);
       },
     });
     tl.to(image, { scale: 0.96, opacity: 0, duration: 0.25, ease: "power2.in" });
     tl.to(
       backdrop,
       { opacity: 0, duration: 0.25, ease: "power2.in" },
       0,
     );

     return () => {
       tl.kill();
       gsap.killTweensOf([backdrop, image]);
     };
   }, [isClosing]);
   ```

5. **Wire refs into the JSX** and keep the lightbox mounted while closing:
   ```jsx
   {(lightboxIndex !== null || isClosing) && (
     <div
       ref={lightboxBackdropRef}
       className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90"
       style={{ opacity: 0 }}
       onClick={closeLightbox}
     >
       {/* eslint-disable-next-line @next/next/no-img-element */}
       <img
         ref={lightboxImageRef}
         src={lightboxIndex !== null ? `/${PROJECTS[lightboxIndex].file}` : ""}
         alt={lightboxIndex !== null ? PROJECTS[lightboxIndex].name : ""}
         className="max-h-[92vh] max-w-[92vw] object-contain"
         style={{ opacity: 0, transform: "scale(0.92)" }}
         onClick={(e) => {
           e.stopPropagation();
           closeLightbox();
         }}
       />
     </div>
   )}
   ```

6. **Update the Escape key handler** to call `closeLightbox()` instead of `setLightboxIndex(null)`.

## Boundaries

- Do NOT touch the WebGL shader or the carousel layout loop. This plan is only for the DOM lightbox transition.
- Do NOT add new dependencies. GSAP is already available.
- Do NOT change the lightbox layout or z-index. Only add animation state and refs.
- Do NOT remove the existing click/drag threshold (`pointerTravel < 5`) or the `hitAt` logic.
- If the current lightbox JSX has drifted from the excerpt above, STOP and re-read the file before applying these edits.

## Verification

- **Mechanical**:
  - `npm run build` succeeds.
  - `npm run lint` passes.
  - `npx prettier --check components/Carousel.jsx` passes.
- **Feel check** (run `npm run dev` and open `http://localhost:3000`):
  - Click any card. The dark backdrop should fade in quickly; the image should pop in with a visible elastic overshoot, not a linear fade.
  - Click the image or backdrop to close. The image should shrink slightly and fade out faster than it opened; the backdrop should fade out in parallel.
  - Spam click a card while the lightbox is opening/closing. There should never be two lightboxes, a stuck overlay, or a frozen half-visible image.
  - Open DevTools Animations panel, set playback to 25%, and confirm the image scale overshoots slightly past 1.0 before settling.
- **Done when**: the lightbox entrance/exit feels like it is part of the same elastic world as the ring, and rapid open/close never desyncs.
