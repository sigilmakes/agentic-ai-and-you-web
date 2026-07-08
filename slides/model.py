from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Slide:
    """A parsed slide: YAML attributes plus Markdown body."""

    number: int
    attrs: dict[str, Any] = field(default_factory=dict)
    body: str = ""


@dataclass(slots=True)
class Deck:
    """A parsed deck and its optional presentation metadata."""

    slides: list[Slide]
    meta: dict[str, Any] = field(default_factory=dict)
