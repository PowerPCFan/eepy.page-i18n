import { AsyncLocalStorage } from "node:async_hooks";
import type { i18n } from "i18next";
import { registerServerInstanceGetter, rootI18n, normalizeLocale } from "./index";

const serverStorage = new AsyncLocalStorage<i18n>();

registerServerInstanceGetter(() => {
    return serverStorage.getStore() ?? null;
});

export function resolveLocaleFromEvent(event: {
    cookies: { get(name: string): string | undefined };
    request: { headers: { get(name: string): string | null } };
}): string {
    const cookieLocale = event.cookies.get("preferred_locale");
    if (cookieLocale) {
        return normalizeLocale(cookieLocale);
    }

    const acceptHeader = event.request.headers.get("accept-language");
    if (acceptHeader) {
        const preferred = acceptHeader.split(",")[0]?.split(";")[0]?.trim();
        if (preferred) {
            return normalizeLocale(preferred);
        }
    }

    return "en";
}

export function createRequestI18n(locale: string): i18n {
    return rootI18n.cloneInstance({ lng: normalizeLocale(locale) });
}

export function runWithRequestI18n<T>(requestI18n: i18n, fn: () => T): T {
    return serverStorage.run(requestI18n, fn);
}
