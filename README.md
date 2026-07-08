# Agentic AI And You

A Markdown-powered HTML slide deck for the **Agentic AI And You** talk.

The repo is still the deployable talk site: GitHub Pages serves the generated
`index.html`. The reusable part is the local `slides` CLI, which turns
`src/slides.md` plus the theme assets in `src/` into a self-contained deck.

## Build the deck

```bash
uv run slides build
```

Defaults:

- input: `src/slides.md`
- output: `index.html`
- template: `src/template.html`
- theme CSS: `src/style.css`
- deck JS: `src/main.js`
- shader: `src/shader.frag`

You can also build another deck with the same visual system:

```bash
uv run slides build path/to/slides.md --out path/to/index.html
```

## Edit the talk

Slides live in `src/slides.md`. Each slide is a pair of YAML frontmatter and
Markdown body:

```markdown
---
layout: split
image: images/example.png
---
## Slide title

- Ordinary Markdown bullets
- Nested bullets work too
```

Use a new `---` frontmatter block for each new slide.

## Deck metadata

The first slide can define footer/title metadata under `deck`:

```yaml
deck:
  title: Agentic AI And You
  footer-left: Willow Sparks
  footer-right: Agentic AI And You
```

## Layouts

Supported layouts:

- `title` — centred title slide.
- `statement` — centred statement/content slide.
- `default` — normal frame.
- `wide` — wide frame, useful for image grids and custom diagrams.
- `split` — left Markdown panel, right image panel.
- `split-50-50` — equal two-column split.

Common frontmatter keys:

```yaml
layout: split
class: frame-wide center
image: images/example.png
image-glow: true
image-caption: Optional caption
image-step: 2
steps: true
list-class: compact two-col-bullets
```

## Reveals / steps

For normal Markdown bullet lists, add `steps: true`:

```markdown
---
steps: true
---
## Stepwise bullets

- First reveal
- Second reveal
- Third reveal
```

For precise choreography, use raw HTML with `class="step hidden"` and optional
`data-step` values. Raw HTML is passed through unchanged.

## Custom visuals

Markdown is the default, but HTML is intentionally supported for bespoke slides:

```html
<div class="three-boxes">
  <div class="box"><p>One</p></div>
  <div class="box box-accent"><p>Two</p></div>
</div>
```

The current aesthetic lives in `src/style.css`, `src/main.js`, and
`src/shader.frag`, so future decks can reuse the same builder and theme while
using different Markdown content.
