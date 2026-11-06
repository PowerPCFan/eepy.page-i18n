import authEn from "../../../locales/en/auth.json";
import commonEn from "../../../locales/en/common.json";
import dashboardEn from "../../../locales/en/dashboard.json";
import domainsEn from "../../../locales/en/domains.json";
import errorsEn from "../../../locales/en/errors.json";
import supportEn from "../../../locales/en/support.json";

import authEs from "../../../locales/es/auth.json";
import commonEs from "../../../locales/es/common.json";
import dashboardEs from "../../../locales/es/dashboard.json";
import domainsEs from "../../../locales/es/domains.json";
import errorsEs from "../../../locales/es/errors.json";
import supportEs from "../../../locales/es/support.json";

import authFi from "../../../locales/fi/auth.json";
import commonFi from "../../../locales/fi/common.json";
import dashboardFi from "../../../locales/fi/dashboard.json";
import domainsFi from "../../../locales/fi/domains.json";
import errorsFi from "../../../locales/fi/errors.json";
import supportFi from "../../../locales/fi/support.json";

export const SUPPORTED_LOCALES = ["en", "fi", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

export const resources = {
    en: {
        translation: {
            auth: authEn,
            common: commonEn,
            dashboard: dashboardEn,
            domains: domainsEn,
            errors: errorsEn,
            support: supportEn,
        },
    },
    es: {
        translation: {
            auth: authEs,
            common: commonEs,
            dashboard: dashboardEs,
            domains: domainsEs,
            errors: errorsEs,
            support: supportEs,
        },
    },
    fi: {
        translation: {
            auth: authFi,
            common: commonFi,
            dashboard: dashboardFi,
            domains: domainsFi,
            errors: errorsFi,
            support: supportFi,
        },
    },
} as const;
