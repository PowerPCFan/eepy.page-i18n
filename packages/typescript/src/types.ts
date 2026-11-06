import type { resources, SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./catalogs";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationValues = Record<string, any>;

export type TranslationResources = (typeof resources)["en"];

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "translation";
        resources: TranslationResources;
        parseInterpolation: "icu";
    }
}
