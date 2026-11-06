import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { IntlMessageFormat } from "intl-messageformat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.resolve(__dirname, "../locales");
const BASE_LOCALE = "en";

let hasErrors = false;

function logError(msg) {
    console.error(`\x1b[31m✖ ERROR:\x1b[0m ${msg}`);
    hasErrors = true;
}

function logSuccess(msg) {
    console.log(`\x1b[32m✔ SUCCESS:\x1b[0m ${msg}`);
}

function logInfo(msg) {
    console.log(`\x1b[36mℹ INFO:\x1b[0m ${msg}`);
}

function logWarn(msg) {
    console.warn(`\x1b[33m⚠ WARNING:\x1b[0m ${msg}`);
}

if (!fs.existsSync(LOCALES_DIR)) {
    logError(`Locales directory not found at ${LOCALES_DIR}`);
    process.exit(1);
}

const locales = fs.readdirSync(LOCALES_DIR).filter(item => {
    return fs.statSync(path.join(LOCALES_DIR, item)).isDirectory() && !item.startsWith(".");
});

logInfo(`Validating canonical locales: ${locales.join(", ")}`);

const loadedCatalogs = {};

for (const locale of locales) {
    loadedCatalogs[locale] = {};
    const localeDir = path.join(LOCALES_DIR, locale);
    const files = fs.readdirSync(localeDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
        const filePath = path.join(localeDir, file);
        const namespace = path.basename(file, ".json");
        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            loadedCatalogs[locale][namespace] = parsed;
        } catch (err) {
            logError(`Invalid JSON in file ${filePath}: ${err.message}`);
        }
    }
}

function collectKeys(tree, prefix = "") {
    let result = [];
    for (const [key, val] of Object.entries(tree)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (typeof val === "string") {
            result.push({ path: currentPath, value: val });
        } else if (typeof val === "object" && val !== null) {
            result = result.concat(collectKeys(val, currentPath));
        } else {
            logError(`Unexpected non-string/non-object value at ${currentPath}: ${typeof val}`);
        }
    }
    return result;
}

for (const locale of locales) {
    const namespaces = loadedCatalogs[locale];
    for (const [ns, tree] of Object.entries(namespaces)) {
        const items = collectKeys(tree, ns);
        for (const { path: keyPath, value } of items) {
            try {
                new IntlMessageFormat(value, locale);
            } catch (err) {
                logError(`[${locale}] Invalid ICU MessageFormat syntax at "${keyPath}": "${value}"\n  ${err.message}`);
            }

            const openCount = (value.match(/\{/g) || []).length;
            const closeCount = (value.match(/\}/g) || []).length;
            if (openCount !== closeCount) {
                logError(`[${locale}] Unbalanced curly braces at "${keyPath}": "${value}"`);
            }
        }
    }
}

if (loadedCatalogs[BASE_LOCALE]) {
    const baseNamespaces = Object.keys(loadedCatalogs[BASE_LOCALE]).sort();

    for (const locale of locales) {
        if (locale === BASE_LOCALE) continue;

        const currentNamespaces = Object.keys(loadedCatalogs[locale]).sort();
        for (const ns of baseNamespaces) {
            if (!currentNamespaces.includes(ns)) {
                logWarn(`[${locale}] Missing namespace file: "${ns}.json" (will fall back to "${BASE_LOCALE}")`);
            }
        }

        for (const ns of baseNamespaces) {
            const baseTree = loadedCatalogs[BASE_LOCALE][ns] || {};
            const targetTree = loadedCatalogs[locale][ns] || {};

            const baseKeys = collectKeys(baseTree, ns).map(k => k.path);
            const targetKeys = collectKeys(targetTree, ns).map(k => k.path);

            const baseKeySet = new Set(baseKeys);
            const targetKeySet = new Set(targetKeys);

            let missingCount = 0;
            for (const key of baseKeys) {
                if (!targetKeySet.has(key)) {
                    missingCount++;
                }
            }
            if (missingCount > 0) {
                logWarn(`[${locale}] "${ns}.json": ${missingCount} missing key(s) (will fall back to "${BASE_LOCALE}")`);
            }

            for (const key of targetKeys) {
                if (!baseKeySet.has(key)) {
                    logWarn(`[${locale}] Extraneous key not present in "${BASE_LOCALE}": "${key}"`);
                }
            }
        }
    }
}

if (hasErrors) {
    console.error("\n\x1b[31mValidation failed with errors.\x1b[0m\n");
    process.exit(1);
} else {
    logSuccess("All canonical catalogs validated successfully!");
}
