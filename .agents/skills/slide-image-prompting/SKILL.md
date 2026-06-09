# Slide Image Prompting

Use this skill when generating or revising images for research-docs Marp slides, especially when the image must feel slide-native, avoid generic AI aesthetics, or contain readable text.

## Core Rule

For slide diagrams, treat the visual as a presentation artifact, not as concept art. If exact labels or Japanese copy matter, do not rely on an image model to render that text. Generate or design the visual with reserved label areas, then place the exact text deterministically inside the final SVG/PNG.

## Workflow

1. Define the slide job before prompting.
   - Audience: beginner, technical, executive, or mixed.
   - One message: the single idea the image must carry.
   - Canvas: usually 16:9 landscape, matching the deck.
   - Required text: title, labels, short callout, and source/caption needs.
   - Reading order: left-to-right, top-to-bottom, or layered.

2. Choose the asset path.
   - Use SVG or HTML-to-PNG when the image is a diagram, comparison, workflow, architecture map, or any text-heavy visual.
   - Use GPT Images for bitmap backgrounds, product-like scenes, visual metaphors, or texture/detail that would be expensive to draw by hand.
   - For exact text, compose text after generation using SVG/HTML/CSS/Pillow/canvas, then inspect the rendered slide.

3. Prompt like an artifact spec.
   - Name the deliverable: "presentation slide diagram", "clean workflow diagram", "editorial explainer graphic".
   - Specify layout hierarchy, canvas ratio, palette, spacing, and text areas.
   - Provide exact labels only when they are short and large; otherwise request blank label panels.
   - Prefer "clean classroom handout or slide", "white background", "clear arrows", "readable labels", "polished spacing".

4. Remove AI-looking cliches.
   - Avoid: glowing brain, robot face, neon network, random circuitry, magic particles, glassmorphism, bokeh, isometric cloud collage, generic stock-photo people, oversized gradient blobs, meaningless fake UI text.
   - Prefer: restrained editorial infographic, flat icon shapes, real diagrams, simple arrows, labeled zones, limited palette, lots of white space.
   - Use repository colors from `contents/themes/research.css`: `#172033`, `#1b4565`, `#2f9c95`, `#c98220`, `#f6f8fb`, `#ffffff`.

5. Validate visually.
   - Render the deck and inspect screenshots, not just Markdown.
   - Check text at slide size; no cropped labels, fake glyphs, tiny legends, or decorative clutter.
   - The image should still communicate the point when viewed without surrounding slide text.

## Prompt Template

```text
Create a 16:9 presentation slide diagram for [audience].
Message: [one-sentence idea].
Layout: [left-to-right flow / two-column comparison / layered map].
Visual language: restrained editorial infographic, white background, flat geometric shapes, clear arrows, large readable label areas, polished spacing, no stock-photo treatment.
Palette: navy #172033, blue #1b4565, teal #2f9c95, amber #c98220, off-white #f6f8fb.
Required visual elements: [list].
Text handling: reserve blank label panels for exact text to be added later; do not create tiny placeholder text or fake UI copy.
Avoid: glowing AI brain, robots, neon circuitry, bokeh, gradient blobs, glassmorphism, decorative clutter, fake text, clip art.
```

## Source Notes

- OpenAI's image generation guide says GPT Image models can still struggle with precise text placement, clarity, and layout-sensitive composition.
- OpenAI's prompting guide recommends writing slides and diagrams as artifact specs with explicit canvas, hierarchy, readable typography, spacing, and no generic stock-photo treatment.
- Google Cloud's Gemini guidance emphasizes specificity, context/intent, iteration, step-by-step instructions, and camera/composition control.
- Microsoft Copilot and Adobe Firefly guidance both emphasize specific descriptive prompts with subject, style, colors, setting, and concrete details.
