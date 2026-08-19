# Animation improvement plans

| # | Title | Severity | Status | File |
|---|-------|----------|--------|------|
| 001 | Add an elastic open/close transition to the image lightbox | MEDIUM | DONE | `components/Carousel.jsx` |
| 002 | Replace overlay lightbox with a FLIP shared-image transition | HIGH | DONE | `components/Carousel.jsx` |
| 003 | Fade out the "Works '26" heading while the image is expanded | MEDIUM | DONE | `components/Carousel.jsx`, `components/ring/splitText.js` |

## Execution order

1. **002-flip-lightbox-shared-image.md** — implement first. It restructures the lightbox from a centered overlay to a FLIP shared-image transition.
2. **003-heading-fade-on-expand.md** — implement after 002 (or independently). It fades the heading based on the same `lightboxIndex` / `isClosing` state.

Run each plan with an executor agent. After implementation, verify with the commands listed in the plan's Verification section.
