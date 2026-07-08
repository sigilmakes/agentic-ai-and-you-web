from __future__ import annotations

import argparse
from pathlib import Path

from .parser import SlideParseError, parse_deck
from .render import read_asset, render_deck

DEFAULT_INPUT = Path("src/slides.md")
DEFAULT_OUTPUT = Path("index.html")
DEFAULT_TEMPLATE = Path("src/template.html")
DEFAULT_CSS = Path("src/style.css")
DEFAULT_JS = Path("src/main.js")
DEFAULT_SHADER = Path("src/shader.frag")
DEFAULT_SLIDES_HTML = Path("src/slides.html")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="slides", description="Build the Markdown slide deck.")
    subcommands = parser.add_subparsers(dest="command")

    build = subcommands.add_parser("build", help="Build a self-contained HTML deck.")
    build.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT, help="Markdown deck file.")
    build.add_argument("--out", "-o", type=Path, default=DEFAULT_OUTPUT, help="Output HTML file.")
    build.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE, help="HTML template file.")
    build.add_argument("--css", type=Path, default=DEFAULT_CSS, help="Theme CSS file.")
    build.add_argument("--js", type=Path, default=DEFAULT_JS, help="Deck JavaScript file.")
    build.add_argument("--shader", type=Path, default=DEFAULT_SHADER, help="WebGL fragment shader file.")
    build.add_argument(
        "--slides-html",
        type=Path,
        default=DEFAULT_SLIDES_HTML,
        help="Where to write the generated slide fragment. Use '-' to skip.",
    )

    args = parser.parse_args(argv)
    if args.command == "build":
        return build_deck(args)
    if args.command is None:
        parser.print_help()
        return 2

    parser.error(f"unknown command {args.command}")
    return 2


def build_deck(args: argparse.Namespace) -> int:
    try:
        deck = parse_deck(args.input.read_text(encoding="utf-8"))
        html, slides_html = render_deck(
            deck,
            template=read_asset(args.template),
            css=read_asset(args.css),
            js=read_asset(args.js),
            shader=read_asset(args.shader),
        )
    except (OSError, SlideParseError) as error:
        print(f"slides: {error}")
        return 1

    args.out.write_text(html, encoding="utf-8")
    if str(args.slides_html) != "-":
        args.slides_html.parent.mkdir(parents=True, exist_ok=True)
        args.slides_html.write_text(slides_html, encoding="utf-8")

    print(f"Built {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
