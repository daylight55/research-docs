---
name: slide-image-prompting
description: Use when adding or revising images for research-docs slides. Requires drafting slide text first, choosing an image placement, comparing 3 layout/content-density options, then generating a visual that fits the chosen frame without duplicating headings or prose.
---

# Slide Image Prompting

Use this skill when generating or revising images for research-docs Marp slides, especially when the image must feel slide-native, avoid generic AI aesthetics, fit a specific slide frame, or contain readable labels.

## Core Rule

Write the slide before generating the image. The image should explain only the concept that benefits from visual structure. Do not put the slide title, slide lead, source note, footer, or paragraph-style explanation inside the generated image.

For diagrams, treat the visual as a slide component, not a complete slide screenshot. If exact labels or Japanese copy matter, prefer SVG/HTML/CSS or add text deterministically after generation. The final asset must fit the chosen image frame and use the available space without visible white image-box margins.

## Workflow

1. Draft the slide text first.
   - Write the slide title and lead/caption in Markdown.
   - Identify the one sentence the audience should remember.
   - Mark which part is better explained visually than with prose.
   - Keep source notes outside the image.

2. Decide whether an image is needed.
   - Use an image when spatial structure matters: boundary, flow, ownership, architecture, sequence, trade-off, or layered system.
   - Do not generate an image just to restate a title or paragraph.
   - If text alone explains the point, improve the text layout instead.

3. Explore 3 layout/content-density options before generating.
   - **Diagram-heavy**: large centered diagram, very short lead, no extra panels. Use when the visual is the main explanation.
   - **Balanced**: diagram plus 2-3 short bullets or a small note grid. Use when the diagram needs interpretation.
   - **Text-led**: concise explanation, small supporting diagram or icon-like schematic. Use when the concept is subtle and the visual only anchors it.

   For each option, specify:
   - image frame position and rough size
   - what text stays in normal slide markup
   - what labels, if any, belong inside the image
   - expected reading order
   - risk: cramped text, wasted whitespace, duplicated explanation, or unreadable labels

4. Choose the layout before making the asset.
   - Commit to the slide layout first, then generate or draw the image to maximize that exact frame.
   - For a wide image frame, use horizontal flow or architecture.
   - For a narrow or partial-width frame, use fewer nodes, bigger labels, and avoid detailed legends.
   - If the image leaves large unused margins, revise the image crop or slide layout instead of accepting a white boxed asset.

5. Choose the asset path.
   - Use SVG or HTML-to-PNG when the image is a diagram, comparison, workflow, architecture map, or any text-heavy visual.
   - Use GPT Images for bitmap backgrounds, product-like scenes, visual metaphors, or texture/detail that would be expensive to draw by hand.
   - For exact text, compose text after generation using SVG/HTML/CSS/Pillow/canvas, then inspect the rendered slide.

6. Prompt like a component spec.
   - Name the deliverable: "presentation diagram component", "clean workflow diagram", or "editorial explainer graphic".
   - Specify the selected frame: aspect ratio, approximate occupied area, reading order, and required empty margins.
   - Ask for concept nodes, arrows, boundaries, and iconography only.
   - Do not ask for the slide title, subtitle, prose explanation, footer, source note, or decorative frame.
   - Provide exact labels only when they are short and large; otherwise request blank label panels.
   - Prefer "clean classroom handout or slide", "transparent or slide-background-compatible background", "clear arrows", "readable labels", "polished spacing".

7. Remove AI-looking cliches.
   - Avoid: glowing brain, robot face, neon network, random circuitry, magic particles, glassmorphism, bokeh, isometric cloud collage, generic stock-photo people, oversized gradient blobs, meaningless fake UI text.
   - Prefer: restrained editorial infographic, flat icon shapes, real diagrams, simple arrows, labeled zones, limited palette, lots of white space.
   - Use repository colors from `contents/themes/research.css`: `#172033`, `#1b4565`, `#2f9c95`, `#c98220`, `#f6f8fb`, `#ffffff`.

8. Validate visually.
   - Render the deck and inspect screenshots, not just Markdown.
   - Check that generated images are centered in their frame.
   - Check that transparent or image-box margins do not create visible white side bands.
   - Check that the image does not duplicate the slide title, lead, source note, or paragraph explanation.
   - Check text at slide size; no cropped labels, fake glyphs, tiny legends, or decorative clutter.
   - The image should still communicate the visual relationship, while the slide text carries the message.

## Required Decision Note

Before generating or revising an image, write a short decision note in the working context or PR description:

```text
Slide: [title/page]
Message: [one sentence]
Chosen layout: [diagram-heavy / balanced / text-led]
Rejected options: [one-line reason for each of the other two]
Image role: [what only the image explains]
Text outside image: [title/lead/bullets/caption/source]
Image frame: [center/full-width/right column/etc.]
```

Do not skip this step for concept maps, architecture diagrams, or workflow visuals.

## Prompt Template

```text
Create a [aspect ratio] presentation diagram component for [audience].
It will be placed in [frame position and size] on a slide whose title and explanation are already outside the image.
Image role: [what only the diagram should explain].
Layout: [left-to-right flow / two-column comparison / layered map].
Visual language: restrained editorial infographic, transparent or slide-background-compatible background, flat geometric shapes, clear arrows, large readable labels, polished spacing, no stock-photo treatment.
Palette: navy #172033, blue #1b4565, teal #2f9c95, amber #c98220, off-white #f6f8fb.
Required visual elements: [list].
Text handling: include only short node labels; do not include slide title, subtitle, prose explanation, footer, source note, tiny placeholder text, or fake UI copy.
Avoid: glowing AI brain, robots, neon circuitry, bokeh, gradient blobs, glassmorphism, decorative clutter, fake text, clip art, white boxed canvas margins.
```

## Source Notes

- OpenAI's image generation guide says GPT Image models can still struggle with precise text placement, clarity, and layout-sensitive composition.
- OpenAI's prompting guide recommends writing slides and diagrams as artifact specs with explicit canvas, hierarchy, readable typography, spacing, and no generic stock-photo treatment.
- Google Cloud's Gemini guidance emphasizes specificity, context/intent, iteration, step-by-step instructions, and camera/composition control.
- Microsoft Copilot and Adobe Firefly guidance both emphasize specific descriptive prompts with subject, style, colors, setting, and concrete details.
