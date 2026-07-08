from __future__ import annotations

import re
from typing import Any

import yaml

from .model import Deck, Slide

_SLIDE_BOUNDARY = re.compile(r"^---\s*$", re.MULTILINE)


class SlideParseError(ValueError):
    """Raised when a Markdown deck cannot be parsed."""


def parse_deck(source: str) -> Deck:
    """Parse a deck written as repeated YAML-frontmatter + Markdown pairs.

    Each slide uses the same shape:

        ---
        layout: split
        ---
        ## Slide body

    The next ``---`` starts the next slide's frontmatter. This is deliberately
    close to Slidev-style authoring while keeping parsing predictable.
    """

    chunks = _SLIDE_BOUNDARY.split(source)
    if chunks and chunks[0].strip() == "":
        chunks = chunks[1:]

    if not chunks:
        return Deck(slides=[])

    if len(chunks) % 2 != 0:
        raise SlideParseError(
            "Deck must be written as repeated '--- frontmatter --- body' slide blocks. "
            "A slide is missing either its frontmatter delimiter or its body."
        )

    slides: list[Slide] = []
    deck_meta: dict[str, Any] = {}

    for index in range(0, len(chunks), 2):
        attrs_text = chunks[index].strip()
        body = chunks[index + 1].strip("\n")
        attrs = _parse_attrs(attrs_text, slide_number=(index // 2) + 1)

        if index == 0 and isinstance(attrs.get("deck"), dict):
            deck_meta = dict(attrs["deck"])

        slides.append(Slide(number=len(slides) + 1, attrs=attrs, body=body))

    return Deck(slides=slides, meta=deck_meta)


def _parse_attrs(text: str, slide_number: int) -> dict[str, Any]:
    if not text:
        return {}

    try:
        value = yaml.safe_load(text)
    except yaml.YAMLError as error:
        raise SlideParseError(f"YAML error in slide {slide_number}: {error}") from error

    if value is None:
        return {}
    if not isinstance(value, dict):
        raise SlideParseError(f"Frontmatter for slide {slide_number} must be a mapping.")
    return value
