import contextlib
from typing import Any

from .catalog import DEFAULT_LOCALE, SUPPORTED_LOCALES


def normalize_locale(locale_str: str | None) -> str:
    if not locale_str:
        return DEFAULT_LOCALE

    base = locale_str.lower().split("-")[0].split("_")[0].strip()

    if base in SUPPORTED_LOCALES:
        return base
    return DEFAULT_LOCALE


def parse_accept_language(header: str | None) -> str | None:
    if not header:
        return None

    languages: list[tuple[str, float]] = []
    for item in header.split(","):
        parts = item.strip().split(";")
        code = parts[0].strip()
        quality = 1.0
        for param_r in parts[1:]:
            param = param_r.strip()
            if param.startswith("q="):
                try:
                    quality = float(param[2:])
                except ValueError:
                    quality = 0.0
        languages.append((code, quality))

    languages.sort(key=lambda x: x[1], reverse=True)
    for code, _ in languages:
        normalized = normalize_locale(code)
        if normalized in SUPPORTED_LOCALES:
            return normalized

    return None


def resolve_request_locale(  # noqa: C901
    request: Any | None = None,  # noqa: ANN401
    lang_param: str | None = None,
    accept_language_header: str | None = None,
    user_preference: str | None = None,
) -> str:
    if request is not None:
        with contextlib.suppress(Exception):
            if q := getattr(request, "query_params", None):
                q: dict | None
                q_lang = q.get("lang")
                if q_lang:
                    normalized = normalize_locale(q_lang)
                    if normalized in SUPPORTED_LOCALES:
                        return normalized

            if h := getattr(request, "headers", None):
                h: dict | None
                h_accept = h.get("accept-language")
                matched = parse_accept_language(h_accept)
                if matched:
                    return matched

    if lang_param:
        normalized = normalize_locale(lang_param)
        if normalized in SUPPORTED_LOCALES:
            return normalized

    if accept_language_header:
        matched = parse_accept_language(accept_language_header)
        if matched:
            return matched

    if user_preference:
        normalized = normalize_locale(user_preference)
        if normalized in SUPPORTED_LOCALES:
            return normalized

    return DEFAULT_LOCALE
