#!/usr/bin/env python3
"""Build the static presentation from source files.

Run with: python build.py

Reads src/template.html, src/slides.html, src/style.css, src/shader.frag
and src/main.js, then emits a single self-contained index.html.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"


def read(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


def build() -> None:
    template = read("template.html")
    slides = read("slides.html")
    css = read("style.css")
    shader = read("shader.frag").strip()
    js = read("main.js").replace("{{SHADER_SOURCE}}", shader)

    html = template.replace("<!-- SLIDES_PLACEHOLDER -->", slides)
    html = html.replace("<!-- CSS_PLACEHOLDER -->", css)
    html = html.replace("<!-- JS_PLACEHOLDER -->", js)

    OUT.write_text(html, encoding="utf-8")
    print(f"Built {OUT}")


if __name__ == "__main__":
    build()
