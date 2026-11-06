import logging
from contextvars import ContextVar
from typing import Any

from icu4py.messageformat import MessageFormat

from .catalog import DEFAULT_LOCALE, catalog

logger = logging.getLogger("eepy.page")

_request_locale: ContextVar[str] = ContextVar("request_locale", default=DEFAULT_LOCALE)
_formatter_cache: dict[tuple[str, str], MessageFormat] = {}


def set_current_locale(locale: str) -> None:
    _request_locale.set(locale.lower().split("-")[0])


def get_current_locale() -> str:
    return _request_locale.get()


def t(key: str, locale: str | None = None, **kwargs: Any) -> str:  # noqa: ANN401
    """
    Main translation function

    Supports:
      - Nested keys: t("errors.domains.NOT_FOUND", domain="test.eepy.page")
      - ICU MessageFormat
      - Fallback to English for missing translations
      - Request-scoped locale via contextvars
    """
    target_locale = (locale or get_current_locale() or DEFAULT_LOCALE).lower().split("-")[0]
    pattern = catalog.get_pattern(key, locale=target_locale)

    if pattern is None and target_locale != DEFAULT_LOCALE:
        pattern = catalog.get_pattern(key, locale=DEFAULT_LOCALE)

    if pattern is None:
        logger.warning(f"Missing translation key: '{key}' for locale '{target_locale}'")
        return f"[{key}]"

    if "{" not in pattern:
        return pattern

    try:
        cache_key = (target_locale, pattern)
        formatter = _formatter_cache.get(cache_key)
        if formatter is None:
            formatter = MessageFormat(pattern, target_locale)
            _formatter_cache[cache_key] = formatter
        return formatter.format(kwargs)
    except Exception:
        logger.exception(f"Error formatting ICU message for key '{key}' pattern '{pattern}':")
        try:
            return pattern.format(**kwargs)
        except Exception:
            return pattern
