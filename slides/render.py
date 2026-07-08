from __future__ import annotations

from html import escape
from pathlib import Path
from typing import Any

from .markdown import render_markdown
from .model import Deck, Slide


DEFAULT_DECK_TITLE = "Slides"


def render_deck(
    deck: Deck,
    *,
    template: str,
    css: str,
    js: str,
    shader: str,
) -> tuple[str, str]:
    """Render a parsed deck into final HTML and the slide-only HTML fragment."""

    slides_html = "\n\n".join(render_slide(slide, active=(i == 0)) for i, slide in enumerate(deck.slides))
    deck_title = _meta(deck, "title", default=DEFAULT_DECK_TITLE)
    footer_left = _meta(deck, "footer-left", default="")
    footer_right = _meta(deck, "footer-right", default=deck_title)

    final_js = js.replace("{{SHADER_SOURCE}}", shader.strip())
    html = (
        template.replace("<!-- SLIDES_PLACEHOLDER -->", slides_html)
        .replace("<!-- CSS_PLACEHOLDER -->", css)
        .replace("<!-- JS_PLACEHOLDER -->", final_js)
        .replace("{{DECK_TITLE}}", escape(str(deck_title)))
        .replace("{{FOOTER_LEFT}}", escape(str(footer_left)))
        .replace("{{FOOTER_RIGHT}}", escape(str(footer_right)))
    )
    return html, slides_html


def render_slide(slide: Slide, *, active: bool = False) -> str:
    layout = _attr(slide, "layout", default="default")
    if layout == "title":
        return _render_title(slide, active=active)
    if layout == "statement":
        return _render_statement(slide, active=active)
    if layout in {"split", "split-50-50"}:
        return _render_split(slide, layout=layout, active=active)
    if layout == "wide":
        return _render_default(slide, active=active, default_frame_class="frame-wide")
    return _render_default(slide, active=active)


def _render_title(slide: Slide, *, active: bool) -> str:
    body = _render_body(slide)
    section_class = _section_class("slide title-slide center", active)
    return f'''      <!-- SLIDE {slide.number} -->
      <section class="{section_class}" data-slide="{slide.number}">
        <div class="frame center">
{_indent(body, 10)}
        </div>
      </section>'''


def _render_statement(slide: Slide, *, active: bool) -> str:
    body = _render_body(slide)
    section_class = _section_class("slide statement-slide", active)
    return f'''      <!-- SLIDE {slide.number} -->
      <section class="{section_class}" data-slide="{slide.number}">
        <div class="frame center">
{_indent(body, 10)}
        </div>
      </section>'''


def _render_default(slide: Slide, *, active: bool, default_frame_class: str = "") -> str:
    body = _render_body(slide)
    frame_class = _attr(slide, "class", "frame-class", default=default_frame_class)
    frame_attr = f'frame {frame_class}'.strip()
    section_class = _section_class("slide", active)
    return f'''      <!-- SLIDE {slide.number} -->
      <section class="{section_class}" data-slide="{slide.number}">
        <div class="{frame_attr}">
{_indent(body, 10)}
        </div>
      </section>'''


def _render_split(slide: Slide, *, layout: str, active: bool) -> str:
    left_source, right_source = _split_body(slide.body)
    left_html = _render_body(slide, body=left_source)
    image_html = _render_image_panel(slide)

    if right_source is not None:
        right_html = render_markdown(right_source.strip(), steps=False)
        image_html = f'''          <div class="panel center">
{_indent(right_html, 12)}
          </div>'''

    split_class = "split split-50-50" if layout == "split-50-50" else _attr(slide, "split", default="split split-60-40")
    section_class = _section_class("slide", active)
    return f'''      <!-- SLIDE {slide.number} -->
      <section class="{section_class}" data-slide="{slide.number}">
        <div class="frame {split_class}">
          <div class="panel">
{_indent(left_html, 12)}
          </div>
{image_html}
        </div>
      </section>'''


def _render_body(slide: Slide, *, body: str | None = None) -> str:
    return render_markdown(
        slide.body if body is None else body,
        steps=bool(_attr(slide, "steps", default=False)),
        list_class=_attr(slide, "list-class", default="dense"),
    )


def _render_image_panel(slide: Slide) -> str:
    image = _attr(slide, "image", default="")
    if not image:
        return ""

    image_glow = bool(_attr(slide, "image-glow", default=False))
    image_caption = _attr(slide, "image-caption", default="")
    image_step = _attr(slide, "image-step", default=None)

    img_class = "panel-image"
    attrs = 'alt=""'
    if image_step is not None:
        img_class += " step hidden"
        attrs += f' data-step="{escape(str(image_step))}"'

    src = escape(str(image), quote=True)
    if image_glow:
        return f'''          <div class="panel center">
            <div class="glow-panel">
              <img src="{src}" {attrs} class="{img_class}" />
            </div>
          </div>'''
    if image_caption:
        return f'''          <div class="panel center image-with-caption">
            <img src="{src}" {attrs} class="{img_class}" />
            <p class="caption image-caption-overlay">{escape(str(image_caption))}</p>
          </div>'''
    return f'''          <div class="panel center">
            <img src="{src}" {attrs} class="{img_class}" />
          </div>'''


def _split_body(body: str) -> tuple[str, str | None]:
    marker = "<!-- right -->"
    if marker not in body:
        return body, None
    left, right = body.split(marker, 1)
    return left, right


def _section_class(base: str, active: bool) -> str:
    return f"{base} active" if active else base


def _indent(text: str, spaces: int) -> str:
    prefix = " " * spaces
    return "\n".join(f"{prefix}{line}" if line else "" for line in text.splitlines())


def _attr(slide: Slide, *names: str, default: Any = None) -> Any:
    for name in names:
        if name in slide.attrs:
            return slide.attrs[name]
    return default


def _meta(deck: Deck, *names: str, default: Any = None) -> Any:
    for name in names:
        if name in deck.meta:
            return deck.meta[name]
    return default


def read_asset(path: Path) -> str:
    return path.read_text(encoding="utf-8")
