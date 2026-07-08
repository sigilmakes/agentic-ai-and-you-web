from __future__ import annotations

from typing import Any

from markdown_it import MarkdownIt
from markdown_it.token import Token


def render_markdown(source: str, *, steps: bool = False, list_class: str | None = None) -> str:
    """Render slide Markdown to HTML.

    When ``steps`` is true, top-level Markdown list items are marked as reveal
    steps. Raw HTML remains untouched, so custom slides can still opt into exact
    ``data-step`` choreography by hand.
    """

    md = MarkdownIt("commonmark", {"html": True})

    def bullet_list_open(tokens: list[Token], idx: int, options: Any, env: dict[str, Any]) -> str:
        depth = env.get("_list_depth", 0)
        if depth == 0 and list_class:
            _add_class(tokens[idx], list_class)
        env["_list_depth"] = depth + 1
        return md.renderer.renderToken(tokens, idx, options, env)

    def bullet_list_close(tokens: list[Token], idx: int, options: Any, env: dict[str, Any]) -> str:
        env["_list_depth"] = max(0, env.get("_list_depth", 1) - 1)
        return md.renderer.renderToken(tokens, idx, options, env)

    def ordered_list_open(tokens: list[Token], idx: int, options: Any, env: dict[str, Any]) -> str:
        return bullet_list_open(tokens, idx, options, env)

    def ordered_list_close(tokens: list[Token], idx: int, options: Any, env: dict[str, Any]) -> str:
        return bullet_list_close(tokens, idx, options, env)

    def list_item_open(tokens: list[Token], idx: int, options: Any, env: dict[str, Any]) -> str:
        if steps and env.get("_list_depth") == 1:
            step = env.get("_step", 0) + 1
            env["_step"] = step
            _add_class(tokens[idx], "step hidden")
            tokens[idx].attrSet("data-step", str(step))
        return md.renderer.renderToken(tokens, idx, options, env)

    md.renderer.rules["bullet_list_open"] = bullet_list_open
    md.renderer.rules["bullet_list_close"] = bullet_list_close
    md.renderer.rules["ordered_list_open"] = ordered_list_open
    md.renderer.rules["ordered_list_close"] = ordered_list_close
    md.renderer.rules["list_item_open"] = list_item_open

    env: dict[str, Any] = {"_list_depth": 0, "_step": 0}
    return md.render(source, env).strip()


def _add_class(token: Token, class_name: str) -> None:
    existing = token.attrGet("class")
    token.attrSet("class", f"{existing} {class_name}" if existing else class_name)
