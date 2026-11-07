from collections.abc import Mapping

from .catalog import DEFAULT_LOCALE, SUPPORTED_LOCALES


def normalize_locale(locale_str: str | None) -> str:
    if not locale_str:
        return DEFAULT_LOCALE

    base = locale_str.lower().split("-")[0].split("_")[0].strip()

    if base in SUPPORTED_LOCALES:
        return base
    return DEFAULT_LOCALE


def resolve_request_locale(
    headers: Mapping[str, str] | None = None,
    locale_override: str | None = None,
) -> str:
    if locale_override:
        normalized = normalize_locale(locale_override)
        if normalized in SUPPORTED_LOCALES:
            return normalized

    if headers:
        val = headers.get("x-locale") or headers.get("X-Locale")
        if val:
            normalized = normalize_locale(val)
            if normalized in SUPPORTED_LOCALES:
                return normalized

    return DEFAULT_LOCALE
