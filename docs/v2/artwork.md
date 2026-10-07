# Original artwork provenance

Generated on 2026-10-07 using the built-in `image_gen` tool through the imagegen skill. Both outputs were inspected. These are artistic analogies, not measurements or engine state. No third-party stock imagery is used.

Runtime originals are the optimized WebP files under `web/public/art/`, copied by Vite to `dist/art/`. The large generation PNGs are intentionally not required for runtime or bundled. Encoding used sharp 0.35.5 installed only under `/tmp`: aspect-preserving resize, WebP quality 83, effort 6. No image-processing dependency was added to the project.

## Hero

Files: `quantum-hero-1440.webp` (1440×960), `quantum-hero-720.webp` (720×480).

Prompt:

Use case: stylized-concept. Asset type: original quantum-inspired website hero artwork, landscape 1536x1024. Create a breathtaking scientific art photograph of an interference field: an intricate luminous mint-green toroidal wave sculpture, made of thousands of very fine curved photon-like filaments and oscillating lines, with an elliptical dark center, tilted diagonally in three dimensional space. The luminous structure floats on the right two-thirds of the composition with generous empty almost-black dark forest green space at the left. Quiet, sophisticated laboratory aesthetic, fine film grain, subtle surrounding pinpoints, elegant depth, white-hot pale mint highlights, soft emerald bloom, very dark green-black background #080f0d. Absolutely no text, numbers, logos, UI, frame or watermark. Abstract artistic interpretation, not a physical measurement or a scientifically accurate quantum state.

## Interference field

Files: `interference-field-960.webp` (960×640), `interference-field-480.webp` (480×320).

Prompt:

Use case: stylized-concept. Asset type: quantum-inspired interference illustration for a research website, 1536x1024 landscape. A dark elegant scientific art print of two overlapping circular wave fields on a black forest-green plane. Hundreds of very fine mint-green concentric light ripples cross and cancel, forming a mesmerizing interference pattern with intricate luminous caustics. Oblique perspective looking down on the plane, soft green light, quiet sophisticated laboratory aesthetic, fine grain, dark negative space around the edges, crisp filaments. No text, no symbols, no axes, no logos or watermark. Artistic analogy, not experimental data.

The hero uses `srcSet`, explicit dimensions and high fetch priority. Lower illustrations use lazy loading and async decoding. All asset URLs are relative; the site loads no remote fonts or imagery.
