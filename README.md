# Agentic AI And You

A single-file HTML slide deck.

## Edit the deck

Slides are written in `src/slides.md` using YAML frontmatter and Markdown/HTML body.

Run the build to regenerate `index.html`:

```bash
uv run python build.py
```

## Slide types

- `title` — big centred title slide
- `statement` — centred statement with optional image
- `split` — text on the left, image on the right
- `split-50-50` — equal two-column split
- `wide` — full-width centred content
- `default` — left-aligned content
- `flowchart` — hardcoded slide 4 flowchart

Common frontmatter keys:

```yaml
slide: 1
type: title
eyebrow: Agentic AI And You
title: Why Human Collaboration Is More Important Than Ever
subtitle: Willow Sparks
```

## Animations

Add `steps: true` to a slide to reveal bullets one by one. For finer control, use
`data-step` attributes directly in raw HTML, or use per-bullet `step:` keys.
