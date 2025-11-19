import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const { compileProfileRegexes, collectDetections } = await import("../src/detector-core.js");
const { SCRIPT_TYPES } = await import("../regex/engine.js");

function configureScriptsByType(map) {
    const store = globalThis.__regexMockStore || (globalThis.__regexMockStore = { scripts: {} });
    store.scripts = {};
    Object.entries(map || {}).forEach(([type, scripts]) => {
        const normalizedType = String(type);
        store.scripts[normalizedType] = Array.isArray(scripts)
            ? scripts.map(script => ({ ...script }))
            : [];
    });
}

function buildProfile(overrides = {}) {
    return {
        patterns: ["Kotori"],
        ignorePatterns: [],
        detectGeneral: true,
        detectAttribution: false,
        detectAction: false,
        detectVocative: false,
        detectPossessive: false,
        detectPronoun: false,
        scriptCollections: [],
        ...overrides,
    };
}

function collectNames(text, profile, regexes) {
    const matches = collectDetections(text, profile, regexes, { priorityWeights: { name: 1 } });
    return { matches, names: matches.map(entry => entry.name) };
}

test("preprocessor pipelines scripts in collection priority order", () => {
    configureScriptsByType({
        [SCRIPT_TYPES.GLOBAL]: [
            { id: "global", apply: (text) => `${text} →global` },
        ],
        [SCRIPT_TYPES.PRESET]: [
            { id: "preset", apply: (text) => `${text} →preset` },
        ],
        [SCRIPT_TYPES.SCOPED]: [
            { id: "scoped", apply: (text) => `${text} →scoped` },
        ],
    });

    const profile = buildProfile({ scriptCollections: ["scoped", "global", "preset"] });
    const { regexes } = compileProfileRegexes(profile, {
        unicodeWordPattern: "[\\\p{L}\\\p{M}\\\p{N}_]",
        defaultPronouns: ["she"],
    });
    const { matches } = collectNames("Kotori", profile, regexes);

    assert.equal(matches.preprocessedText, "Kotori →global →preset →scoped");
    assert.ok(matches.length > 0, "expected a detection after preprocessing");
    assert.deepEqual(
        matches.preprocessorScripts.map(entry => entry?.script?.id),
        ["global", "preset", "scoped"],
        "expected applied script order to match pipeline",
    );
});

test("preprocessor only runs scripts that are allowed", () => {
    configureScriptsByType({
        [SCRIPT_TYPES.GLOBAL]: [
            {
                id: "allowed",
                apply: (text) => text.replace("Hero", "Kotori"),
                allowed: true,
            },
            {
                id: "blocked",
                apply: (text) => `${text} [blocked]`,
                allowed: false,
            },
        ],
    });

    const profile = buildProfile({ scriptCollections: ["global"] });
    const { regexes } = compileProfileRegexes(profile, {
        unicodeWordPattern: "[\\\p{L}\\\p{M}\\\p{N}_]",
        defaultPronouns: ["she"],
    });
    const { matches, names } = collectNames("Hero rallies forward.", profile, regexes);

    assert.equal(matches.preprocessedText, "Kotori rallies forward.");
    assert.ok(names.includes("Kotori"), "expected transformed text to yield a Kotori match");
});

test("profiles without script opt-ins keep the original text", () => {
    configureScriptsByType({
        [SCRIPT_TYPES.GLOBAL]: [
            { id: "noop", apply: (text) => `${text} mutated` },
        ],
    });

    const profile = buildProfile({ scriptCollections: [] });
    const { regexes } = compileProfileRegexes(profile, {
        unicodeWordPattern: "[\\\p{L}\\\p{M}\\\p{N}_]",
        defaultPronouns: ["she"],
    });
    const { matches } = collectNames("Kotori", profile, regexes);

    assert.equal(matches.preprocessedText, "Kotori");
});
