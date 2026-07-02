#!/usr/bin/env python3
"""Build the static presentation from source files.

Run with: python build.py

Reads src/template.html, src/slides.md, src/style.css, src/shader.frag
and src/main.js, then emits a single self-contained index.html.
"""

from pathlib import Path
import re
import yaml

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"


def read(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def render_inline_markup(text: str) -> str:
    """Convert simple Markdown-style markers to HTML."""
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"__(.+?)__", r"<u>\1</u>", text)
    text = re.sub(r"~~(.+?)~~", r"<s>\1</s>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    return text


def render_bullets(items, list_class="dense", steps=False, start_step=1):
    class_attr = f' class="{list_class}"' if list_class else ""
    lines = [f'<ul{class_attr}>']
    step = start_step
    for item in items:
        if isinstance(item, str):
            li_class = ""
            data = ""
            content = item
            if content.startswith(">"):
                content = content[1:]
                li_class = "step hidden"
                data = f' data-step="{step}"'
            elif steps:
                li_class = "step hidden"
                data = f' data-step="{step}"'
            if steps:
                step += 1
            class_attr = f' class="{li_class}"' if li_class else ""
            lines.append(f"  <li{class_attr}{data}>{render_inline_markup(content)}</li>")
        elif isinstance(item, dict):
            if "text" in item:
                text = item["text"]
                explicit_step = item.get("step")
                children = item.get("items", [])
                li_class = ""
                data = ""
                if text.startswith(">"):
                    text = text[1:]
                    li_class = "step hidden"
                    data = f' data-step="{step}"'
                    step += 1
                elif steps and explicit_step is None:
                    li_class = "step hidden"
                    data = f' data-step="{step}"'
                    step += 1
                elif explicit_step is not None:
                    li_class = "step hidden"
                    data = f' data-step="{explicit_step}"'
                class_attr = f' class="{li_class}"' if li_class else ""
                lines.append(f"  <li{class_attr}{data}>{render_inline_markup(text)}")
                if children:
                    lines.append(render_bullets(children, list_class="", steps=False))
                lines.append("  </li>")
    lines.append("</ul>")
    return "\n".join(lines)


def render_flowchart_slide(slide_num: int) -> str:
    return f'''      <!-- SLIDE {slide_num} -->
      <section class="slide" data-slide="{slide_num}">
        <div class="frame frame-wide">
          <h2>What is an agent?</h2>
          <div class="agent-flowchart">
            <div class="flow-row">
              <div class="flow-node image-node step hidden" data-step="1">
                <img src="images/slide-4-img-24.png" alt="" />
                <span class="flow-label">An LLM (ChatGPT, Claude etc)</span>
              </div>
              <div class="flow-node image-node step hidden" data-step="2">
                <img src="images/slide-4-img-25.png" alt="" />
                <span class="flow-label">“Tools” (Bash, File I/O, Search etc)</span>
              </div>
            </div>
            <div class="step hidden" data-step="3">
              <div class="flow-path">
                <div class="flow-step">Start with goal</div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">Think + Use tools</div>
                <div class="flow-arrow">→</div>
                <div class="flow-step query">Goal achieved?</div>
                <div class="flow-arrow down">↓</div>
                <div class="flow-step stop">Stop</div>
              </div>
              <div class="flow-loop">and a loop!</div>
            </div>
          </div>
        </div>
      </section>'''


def render_title_slide(fm, slide_num):
    eyebrow = fm.get("eyebrow", "")
    title = fm.get("title", "")
    subtitle = fm.get("subtitle", "")
    parts = []
    if eyebrow:
        parts.append(f'          <p class="eyebrow">{eyebrow}</p>')
    parts.append(f"          <h1>{title}</h1>")
    if subtitle:
        parts.append(f'          <p class="subtitle">{subtitle}</p>')
    content = "\n".join(parts)
    return f'''      <!-- SLIDE {slide_num} -->
      <section class="slide title-slide center active" data-slide="{slide_num}">
        <div class="frame center">
{content}
        </div>
      </section>'''


def render_statement_slide(fm, slide_num, body):
    eyebrow = fm.get("eyebrow", "")
    title = fm.get("title", "")
    subtitle = fm.get("subtitle", "")
    title_style = fm.get("titleStyle", "")
    style_attr = f' style="{title_style}"' if title_style else ""
    parts = []
    if eyebrow:
        parts.append(f'          <p class="eyebrow">{eyebrow}</p>')
    parts.append(f"          <h2{style_attr}>{title}</h2>")
    if subtitle:
        parts.append(f'          <p class="subtitle">{subtitle}</p>')
    if body.strip():
        parts.append(body.strip())
    content = "\n".join(parts)
    return f'''      <!-- SLIDE {slide_num} -->
      <section class="slide statement-slide" data-slide="{slide_num}">
        <div class="frame center">
{content}
        </div>
      </section>'''


def render_split_slide(fm, slide_num, body):
    title = fm.get("title", "")
    image = fm.get("image", "")
    image_glow = fm.get("imageGlow", False)
    image_caption = fm.get("imageCaption", "")
    image_step = fm.get("imageStep")
    bullets = fm.get("bullets", [])
    steps = fm.get("steps", False)
    layout = "split split-60-40" if fm.get("type") != "split-50-50" else "split split-50-50"
    inline_style = ' style="grid-template-columns: 1fr 1fr;"' if layout == "split split-50-50" else ""

    bullet_html = ""
    if bullets:
        list_class = fm.get("listClass", "dense")
        bullet_html = render_bullets(bullets, list_class=list_class, steps=steps)

    if body.strip() and not bullets:
        content_html = body.strip()
    else:
        content_html = f"            <h2>{title}</h2>\n{bullet_html}\n{body.strip()}"

    if image:
        img_class = "panel-image"
        img_attrs = 'alt=""'
        if image_step is not None:
            img_class += " step hidden"
            img_attrs += f' data-step="{image_step}"'
        if image_glow:
            image_html = f'''          <div class="panel center">
            <div class="glow-panel">
              <img src="{image}" {img_attrs} class="{img_class}" />
            </div>
          </div>'''
        elif image_caption:
            image_html = f'''          <div class="panel center image-with-caption">
            <img src="{image}" {img_attrs} class="{img_class}" />
            <p class="caption image-caption-overlay">{image_caption}</p>
          </div>'''
        else:
            image_html = f'''          <div class="panel center">
            <img src="{image}" {img_attrs} class="{img_class}" />
          </div>'''
    elif "<!-- right -->" in body:
        left, right = body.split("<!-- right -->", 1)
        content_html = left.strip()
        image_html = f'''          <div class="panel center">
{right.strip()}
          </div>'''
    else:
        image_html = ""

    return f'''      <!-- SLIDE {slide_num} -->
      <section class="slide" data-slide="{slide_num}">
        <div class="frame {layout}"{inline_style}>
          <div class="panel">
{content_html}
          </div>
{image_html}
        </div>
      </section>'''


def render_default_slide(fm, slide_num, body):
    title = fm.get("title", "")
    frame_class = fm.get("class", "")
    bullets = fm.get("bullets", [])
    steps = fm.get("steps", False)
    list_class = fm.get("listClass", "dense")

    parts = [f"          <h2>{title}</h2>"]
    if bullets:
        parts.append(render_bullets(bullets, list_class=list_class, steps=steps))
    if body.strip():
        parts.append(body.strip())
    content = "\n".join(parts)

    frame_attr = f' class="frame {frame_class}"' if frame_class else ' class="frame"'
    return f'''      <!-- SLIDE {slide_num} -->
      <section class="slide" data-slide="{slide_num}">
        <div{frame_attr}>
{content}
        </div>
      </section>'''


def render_wide_slide(fm, slide_num, body):
    return render_default_slide(fm, slide_num, body)


def render_slide(fm, body, slide_num):
    slide_type = fm.get("type", "default")
    if slide_type == "title":
        return render_title_slide(fm, slide_num)
    if slide_type == "statement":
        return render_statement_slide(fm, slide_num, body)
    if slide_type in ("split", "split-50-50"):
        return render_split_slide(fm, slide_num, body)
    if slide_type == "wide":
        return render_wide_slide(fm, slide_num, body)
    if slide_type == "flowchart":
        return render_flowchart_slide(slide_num)
    return render_default_slide(fm, slide_num, body)


def parse_slides_md(text: str):
    lines = text.strip().splitlines()
    slides = []
    slide_num = 1
    i = 0
    n = len(lines)
    while i < n:
        # Skip empty lines
        while i < n and lines[i].strip() == "":
            i += 1
        if i >= n:
            break
        # Expect --- start of frontmatter
        if lines[i].strip() != "---":
            print(f"Warning: expected --- at line {i+1}, skipping")
            i += 1
            continue
        i += 1
        # Read frontmatter until closing ---
        fm_lines = []
        while i < n and lines[i].strip() != "---":
            fm_lines.append(lines[i])
            i += 1
        if i < n and lines[i].strip() == "---":
            i += 1  # consume closing ---
        fm_text = "\n".join(fm_lines)
        try:
            fm = yaml.safe_load(fm_text) or {}
        except yaml.YAMLError as e:
            print(f"YAML error in slide {slide_num}: {e}")
            fm = {}
        # Read body until next --- or end of file
        body_lines = []
        while i < n and not lines[i].strip().startswith("---"):
            body_lines.append(lines[i])
            i += 1
        # Trim leading/trailing blank lines from body
        while body_lines and body_lines[0].strip() == "":
            body_lines.pop(0)
        while body_lines and body_lines[-1].strip() == "":
            body_lines.pop()
        body = "\n".join(body_lines)
        slides.append(render_slide(fm, body, slide_num))
        slide_num += 1
    return "\n\n".join(slides)


def build() -> None:
    template = read("template.html")
    slides_md = read("slides.md")
    css = read("style.css")
    shader = read("shader.frag").strip()
    js = read("main.js").replace("{{SHADER_SOURCE}}", shader)

    slides_html = parse_slides_md(slides_md)
    (SRC / "slides.html").write_text(slides_html, encoding="utf-8")

    html = template.replace("<!-- SLIDES_PLACEHOLDER -->", slides_html)
    html = html.replace("<!-- CSS_PLACEHOLDER -->", css)
    html = html.replace("<!-- JS_PLACEHOLDER -->", js)

    OUT.write_text(html, encoding="utf-8")
    print(f"Built {OUT}")


if __name__ == "__main__":
    build()
