# 002 — Replace overlay lightbox with a FLIP shared-image transition

- **Status**: DONE
- **Commit**: 4b9ac8c
- **Severity**: HIGH
- **Category**: Physicality & origin / Missed opportunities
- **Estimated scope**: 1 file (`components/Carousel.jsx`), ~80 lines

## Problem

The current lightbox (`components/Carousel.jsx:1404`) opens by overlaying a centered `<img>` on a dark backdrop. The user sees two separate objects: the WebGL card underneath and a new large image on top. This breaks the illusion that they are inspecting the same image object. The requested behavior is a single image that scales from the clicked card's position to fullscreen and back.

Current code (`components/Carousel.jsx:1404`):

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
      src={
        lightboxIndex !== null ? `/${PROJECTS[lightboxIndex].file}` : ""
      }
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

## Target

A FLIP-style transition where a single DOM `<img>` starts at the exact screen rectangle of the clicked WebGL card and animates to a centered fullscreen view. The WebGL canvas fades out during expansion so only the one image remains visible at peak; on close the image shrinks back to the card's rectangle and the canvas fades back in.

- **Open**:
  1. On click, snapshot the clicked plane's world position, scale, and rotation from the live uniforms.
  2. Convert to a screen rectangle + CSS rotation.
  3. Render a new `<img>` at that rectangle with `pointer-events-none` and the source image.
  4. Simultaneously fade the WebGL canvas (`containerRef.current`) from `opacity: 1` to `opacity: 0` over **350ms** `power2.out`.
  5. Animate the `<img>` from the snapped rectangle to centered fullscreen (`object-contain`) over **550ms** with `elastic.out(1, 0.6)`, rotating from the card's current angle to `0deg`.
- **Close**:
  1. Fade the WebGL canvas back in to `opacity: 1` over **250ms** `power2.in`.
  2. Animate the `<img>` from fullscreen back to the stored rectangle over **350ms** `power2.inOut`.
  3. On completion, unmount the `<img>` and restore full interactivity.
- **Interruptibility**: rapid open/close never leaves a stray image or hidden canvas. Kill all GSAP tweens on the canvas and image before starting a new phase.

## Repo conventions to follow

- GSAP is the project's motion library. Reuse the existing timeline pattern from the current lightbox effects (`components/Carousel.jsx:62`).
- World-to-screen conversion is already used throughout the file: world origin is screen center, Y is up; screen Y is down. See `ringCentre.x = viewW * 0.5 + cx` (`components/Carousel.jsx:325` area) for the mapping.
- The project image paths come from `PROJECTS[cell].file` and are served from `/public`; this already works for the current lightbox.

## Steps

1. **Add origin state and refs** near the existing lightbox state (`components/Carousel.jsx:53`):
   ```jsx
   const [lightboxIndex, setLightboxIndex] = useState(null);
   const [isClosing, setIsClosing] = useState(false);
   const [lightboxOrigin, setLightboxOrigin] = useState(null);
   const flipImageRef = useRef(null);
   ```

2. **Capture the clicked card's screen rectangle** in `onClick` (`components/Carousel.jsx:524`) before opening:
   ```jsx
   const onClick = () => {
     if (!interactive || pointerTravel >= 5) return;
     const hit = hitAt(pointer.x, pointer.y);
     if (hit < 0) return;

     const sc = uniforms.uScale.value[hit];
     const pos = uniforms.uPos.value[hit];
     const rot = uniforms.uRot.value[hit];
     const W = uniforms.uSize.value.x * sc.x;
     const H = uniforms.uSize.value.y * sc.y;

     setLightboxOrigin({
       x: viewW * 0.5 + pos.x - W * 0.5,
       y: viewH * 0.5 - pos.y - H * 0.5,
       width: W,
       height: H,
       rotation: -rot * (180 / Math.PI),
     });
     openLightbox(cellOf(signedOffset(hit)));
   };
   ```

3. **Replace the centered lightbox JSX** (`components/Carousel.jsx:1404`) with the FLIP image:
   ```jsx
   {(lightboxIndex !== null || isClosing) && lightboxOrigin && (
     <img
       ref={flipImageRef}
       src={lightboxIndex !== null ? `/${PROJECTS[lightboxIndex].file}` : ""}
       alt={lightboxIndex !== null ? PROJECTS[lightboxIndex].name : ""}
       className="fixed z-50 cursor-zoom-out object-contain"
       style={{
         left: lightboxOrigin.x,
         top: lightboxOrigin.y,
         width: lightboxOrigin.width,
         height: lightboxOrigin.height,
         transform: `rotate(${lightboxOrigin.rotation}deg)`,
         opacity: 0,
       }}
       onClick={(e) => {
         e.stopPropagation();
         closeLightbox();
       }}
     />
   )}
   ```

4. **Rewrite the open effect** (`components/Carousel.jsx:62`) to FLIP the image and fade the canvas:
   ```jsx
   useEffect(() => {
     if (lightboxIndex === null || isClosing || !lightboxOrigin) return;
     const image = flipImageRef.current;
     const canvas = containerRef.current;
     if (!image || !canvas) return;

     gsap.killTweensOf([image, canvas]);
     gsap.set(image, { opacity: 1 });

     // compute final object-contain size
     const vw = canvas.clientWidth;
     const vh = canvas.clientHeight;
     const img = new Image();
     img.onload = () => {
       const scale = Math.min((vw * 0.92) / img.width, (vh * 0.92) / img.height);
       const finalW = img.width * scale;
       const finalH = img.height * scale;
       const finalX = (vw - finalW) / 2;
       const finalY = (vh - finalH) / 2;

       const tl = gsap.timeline();
       tl.to(canvas, { opacity: 0, duration: 0.35, ease: "power2.out" }, 0);
       tl.to(
         image,
         {
           x: finalX - lightboxOrigin.x,
           y: finalY - lightboxOrigin.y,
           width: finalW,
           height: finalH,
           rotation: 0,
           duration: 0.55,
           ease: "elastic.out(1, 0.6)",
         },
         0,
       );
     };
     img.src = image.src;

     return () => {
       gsap.killTweensOf([image, canvas]);
     };
   }, [lightboxIndex, isClosing, lightboxOrigin]);
   ```

5. **Rewrite the close effect** (`components/Carousel.jsx:86`) to reverse FLIP and restore the canvas:
   ```jsx
   useEffect(() => {
     if (!isClosing || !lightboxOrigin) return;
     const image = flipImageRef.current;
     const canvas = containerRef.current;
     if (!image || !canvas) return;

     gsap.killTweensOf([image, canvas]);

     const tl = gsap.timeline({
       onComplete: () => {
         setLightboxIndex(null);
         setIsClosing(false);
         setLightboxOrigin(null);
         gsap.set(canvas, { opacity: 1 });
       },
     });
     tl.to(
       canvas,
       { opacity: 1, duration: 0.25, ease: "power2.in" },
       0,
     );
     tl.to(
       image,
       {
         x: 0,
         y: 0,
         width: lightboxOrigin.width,
         height: lightboxOrigin.height,
         rotation: lightboxOrigin.rotation,
         duration: 0.35,
         ease: "power2.inOut",
       },
       0,
     );

     return () => {
       gsap.killTweensOf([image, canvas]);
     };
   }, [isClosing, lightboxOrigin]);
   ```

6. **Remove the now-unused backdrop and centered image refs** (`lightboxBackdropRef`, `lightboxImageRef`) and their initial animation code from steps 4–5.

## Boundaries

- Do NOT change the WebGL shader or plane layout logic. The FLIP image is a DOM layer that imitates the same image object.
- Do NOT add new dependencies. GSAP and React are sufficient.
- Do NOT alter the click/drag threshold (`pointerTravel < 5`) or `hitAt` logic.
- Do NOT remove the lightbox state; extend it with `lightboxOrigin`.
- If the clicked card is near the viewport edge and the final image is much larger, the elastic overshoot may briefly extend past the viewport — this is acceptable and matches the ring's elastic personality.

## Verification

- **Mechanical**:
  - `npm run build` succeeds.
  - `npm run lint` passes.
  - `npx prettier --check components/Carousel.jsx` passes.
- **Feel check** (run `npm run dev`, open `http://localhost:3000`):
  - Click a card. A single image should appear to grow out of the clicked card, not a separate centered overlay.
  - During the open animation the WebGL ring should fade away; at the peak only the large image is visible.
  - Click the image to close. It should shrink back toward the card's original screen position while the ring fades back in.
  - Spam click a card while the animation is playing. The canvas should never stay invisible and a ghost image should never persist.
  - Resize the browser, then open the lightbox. The final image should still be centered and `object-contain`.
- **Done when**: the lightbox feels like the clicked card is expanding into fullscreen and collapsing back, with no visible second image object.
