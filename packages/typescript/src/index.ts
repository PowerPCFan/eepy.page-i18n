import i18next, { type i18n } from "i18next";
import ICU from "i18next-icu";
import Cookies from "js-cookie";
import {
    DEFAULT_LOCALE,
    resources,
    SUPPORTED_LOCALES,
    type SupportedLocale,
} from "./catalogs";
import type { TranslationValues } from "./types";

export { DEFAULT_LOCALE, resources, SUPPORTED_LOCALES, type SupportedLocale, type TranslationValues };

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export function normalizeLocale(localeStr: string | null | undefined): SupportedLocale {
    if (!localeStr) return DEFAULT_LOCALE;
    const base = localeStr.toLowerCase().split(/[-_]/)[0];
    if (base && (SUPPORTED_LOCALES as readonly string[]).includes(base)) {
        return base as SupportedLocale;
    }
    return DEFAULT_LOCALE;
}

export const rootI18n: i18n = i18next.createInstance();
rootI18n.use(ICU).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: "translation",
    nsSeparator: false,
    keySeparator: ".",
    interpolation: {
        escapeValue: false,
    },
    returnEmptyString: false,
    missingKeyHandler: (lng, ns, key) => {
        // @ts-expect-error
        if (typeof process !== "undefined" && (process as any).env?.NODE_ENV === "development") {
            console.warn(`[i18n] Missing translation for key: "${key}" (${lng})`);
        }
    },
});

let serverInstanceGetter: (() => i18n | null) | null = null;

export function registerServerInstanceGetter(fn: () => i18n | null) {
    serverInstanceGetter = fn;
}

export function resolveClientLocale(): SupportedLocale {
    if (!isBrowser) return DEFAULT_LOCALE;
    try {
        const cookieVal = Cookies.get("preferred_locale");
        if (cookieVal) {
            const normalized = normalizeLocale(cookieVal);
            if (normalized) return normalized;
        }

        const stored = localStorage.getItem("preferred_locale");
        if (stored) {
            const normalized = normalizeLocale(stored);
            if (normalized) return normalized;
        }

        if (typeof navigator !== "undefined" && navigator.language) {
            const normalized = normalizeLocale(navigator.language);
            if (normalized) return normalized;
        }
    } catch {}
    return DEFAULT_LOCALE;
}

export function resolveLocale(): SupportedLocale {
    return resolveClientLocale();
}

const initialLocale = isBrowser ? resolveClientLocale() : DEFAULT_LOCALE;
export const clientI18n: i18n = isBrowser
    ? rootI18n.cloneInstance({ lng: initialLocale })
    : rootI18n;

function createStore<T>(initialValue: T) {
    let value = initialValue;
    const subscribers = new Set<(val: T) => void>();
    return {
        subscribe(fn: (val: T) => void) {
            subscribers.add(fn);
            fn(value);
            return () => {
                subscribers.delete(fn);
            };
        },
        set(newVal: T) {
            value = newVal;
            subscribers.forEach(fn => fn(value));
        },
        update(updater: (val: T) => T) {
            this.set(updater(value));
        },
    };
}

export const currentLocale = createStore<SupportedLocale>(initialLocale);

if (isBrowser) {
    try {
        document.documentElement.lang = initialLocale;
    } catch {}
}

export function getActiveI18n(): i18n {
    if (isBrowser) {
        return clientI18n;
    }
    return serverInstanceGetter?.() ?? rootI18n;
}

export function getLocale(): SupportedLocale {
    const instance = getActiveI18n();
    return (instance.language as SupportedLocale) || DEFAULT_LOCALE;
}

export function initClientLocale(serverLocale: string) {
    if (isBrowser) {
        const normalized = normalizeLocale(serverLocale);
        if (clientI18n.language !== normalized) {
            clientI18n.changeLanguage(normalized);
        }
        currentLocale.set(normalized);
        try {
            document.documentElement.lang = normalized;
        } catch {}
    }
}

export function setLocale(locale: string, reload: boolean = true) {
    const normalized = normalizeLocale(locale);
    if (isBrowser) {
        clientI18n.changeLanguage(normalized);
        Cookies.set("preferred_locale", normalized, { expires: 365, sameSite: "lax" });
        try {
            localStorage.setItem("preferred_locale", normalized);
            document.documentElement.lang = normalized;
        } catch {}
        currentLocale.set(normalized);
        if (reload) {
            window.location.reload();
        }
    }
}

export function t(key: string, values?: TranslationValues, localeOverride?: string): string {
    const instance = getActiveI18n();
    const opts: Record<string, any> = {
        ...values,
    };
    if (localeOverride) {
        opts.lng = normalizeLocale(localeOverride);
    }

    const translated = instance.t(key as any, opts);

    if (translated === undefined || translated === null || translated === key) {
        const activeLang = opts.lng || instance.language;
        if (activeLang !== DEFAULT_LOCALE) {
            const fallback = rootI18n.t(key as any, { ...opts, lng: DEFAULT_LOCALE });
            if (fallback && fallback !== key) {
                return fallback;
            }
        }

        // @ts-expect-error
        if (typeof process !== "undefined" && (process as any).env?.NODE_ENV === "development") {
            return `[${key}]`;
        }
        return key.split(".").pop() || key;
    }

    return translated;
}
