import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger("eepy.page")

SUPPORTED_LOCALES = ["en", "fi", "es"]
DEFAULT_LOCALE = "en"

DEFAULT_LOCALES_DIR = Path(__file__).resolve().parent / "locales"


class TranslationCatalog:
    def __init__(self, locales_dir: Path | str | None = None) -> None:
        if locales_dir:
            self.locales_dir = Path(locales_dir)
        elif os.environ.get("LOCALES_DIR"):
            self.locales_dir = Path(os.environ["LOCALES_DIR"])
        elif (Path.cwd() / "locales").is_dir():
            self.locales_dir = Path.cwd() / "locales"
            logger.info(f"Using local dev locales override from {self.locales_dir}")
        else:
            self.locales_dir = DEFAULT_LOCALES_DIR

        self._catalogs: dict[str, dict[str, Any]] = {}
        self.load_catalogs()

    def load_catalogs(self) -> None:
        if not self.locales_dir.exists():
            logger.warning(f"Locales directory does not exist at {self.locales_dir}")
            return

        for locale in SUPPORTED_LOCALES:
            locale_dir = self.locales_dir / locale
            if not locale_dir.is_dir():
                continue

            self._catalogs[locale] = {}
            for json_file in locale_dir.glob("*.json"):
                namespace = json_file.stem
                try:
                    with json_file.open(encoding="utf-8") as f:
                        self._catalogs[locale][namespace] = json.load(f)
                except Exception:
                    logger.exception(f"Failed to load translation catalog {json_file}:")

    def get_pattern(self, key: str, locale: str = DEFAULT_LOCALE) -> str | None:
        target_locale = locale.lower().split("-")[0]
        catalog = self._catalogs.get(target_locale)
        if not catalog:
            return None

        parts = key.split(".")
        if not parts:
            return None

        first = parts[0]
        if first in catalog:
            val = self._traverse(catalog[first], parts[1:])
            if val is not None:
                return val

        if "common" in catalog:
            val = self._traverse(catalog["common"], parts)
            if val is not None:
                return val

        for ns, tree in catalog.items():
            if ns in (first, "common"):
                continue
            val = self._traverse(tree, parts)
            if val is not None:
                return val

        return None

    def _traverse(self, obj: Any, path: list[str]) -> str | None:  # noqa: ANN401
        curr = obj
        for segment in path:
            if not isinstance(curr, dict):
                return None
            curr = curr.get(segment)
            if curr is None:
                return None
        return curr if isinstance(curr, str) else None


catalog = TranslationCatalog()
