# Example gallery backup

`example-gallery-original.zip` contains the original `components/ring/projects.js`
and all 18 original WebP images in their original `public/` paths.

The running site keeps both galleries available:

- `public/gallery/example/` — original example images
- `public/gallery/custom/` — optimized personal gallery images

For a quick gallery switch, change `ACTIVE_GALLERY` in
`components/ring/projects.js` from `"custom"` to `"example"`.

To restore the original repository paths and original `projects.js` exactly,
run this from the repository root:

```bash
unzip -o backups/example-gallery-original.zip -d .
```
