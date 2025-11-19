import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

import { registerTokenizer } from "../tokenizers.js";
const { compileProfileRegexes, collectDetections } = await import("../src/detector-core.js");
const { getWinner } = await import("../index.js");

const SAMPLE_TEXT = "Alice moved quietly across the chamber. Moments later, Alice whispered a warning.";

function registerTestTokenizers() {
    registerTokenizer("cs-mock-whitespace", {
        name: "Mock Whitespace",
        tokenize(text) {
            const input = typeof text === "string" ? text : String(text ?? "");
            if (!input) {
                return { ids: [], offsets: [], chunks: [] };
            }
            const ids = [];
            const offsets = [];
            const chunks = [];
            const pattern = /\S+/g;
            let match;
            while ((match = pattern.exec(input)) !== null) {
                const chunk = match[0];
                ids.push(ids.length + 1);
                offsets.push({ start: match.index, end: match.index + chunk.length });
                chunks.push(chunk);
            }
            return { ids, offsets, chunks };
        },
    });

    registerTokenizer("cs-mock-bigram", {
        name: "Mock Bigrams",
        tokenize(text) {
            const input = typeof text === "string" ? text : String(text ?? "");
            if (!input) {
                return { ids: [], offsets: [], chunks: [] };
            }
            const ids = [];
            const offsets = [];
            const chunks = [];
            for (let index = 0; index < input.length; index += 2) {
                const end = Math.min(input.length, index + 2);
                const chunk = input.slice(index, end);
                ids.push(ids.length + 1);
                offsets.push({ start: index, end });
                chunks.push(chunk);
            }
            return { ids, offsets, chunks };
        },
    });
}

function buildProfile(overrides = {}) {
    return {
        patterns: ["Alice"],
        ignorePatterns: [],
        vetoPatterns: [],
        defaultCostume: "",
        debug: false,
        globalCooldownMs: 0,
        perTriggerCooldownMs: 0,
        failedTriggerCooldownMs: 0,
        maxBufferChars: 128,
        repeatSuppressMs: 0,
        tokenProcessThreshold: 0,
        mappings: [],
        enableOutfits: false,
        detectAttribution: false,
        detectAction: false,
        detectVocative: false,
        detectPossessive: false,
        detectPronoun: false,
        detectGeneral: true,
        pronounVocabulary: ["she"],
        attributionVerbs: [],
        actionVerbs: [],
        detectionBias: 0,
        enableSceneRoster: false,
        prioritySpeakerWeight: 5,
        priorityAttributionWeight: 4,
        priorityActionWeight: 3,
        priorityPronounWeight: 2,
        priorityVocativeWeight: 2,
        priorityPossessiveWeight: 1,
        priorityNameWeight: 1,
        rosterBonus: 0,
        rosterPriorityDropoff: 0,
        distancePenaltyWeight: 1,
        ...overrides,
    };
}

function detectWithTokenizer(profile, tokenizerId, options = {}) {
    const configured = { ...profile, tokenizerId };
    const { regexes } = compileProfileRegexes(configured, {
        unicodeWordPattern: "[\\p{L}\\p{M}\\p{N}_]",
        defaultPronouns: configured.pronounVocabulary,
    });
    return collectDetections(SAMPLE_TEXT, configured, regexes, {
        priorityWeights: { name: 1 },
        ...options,
    });
}

registerTestTokenizers();

const baseProfile = buildProfile();

function extractMinChar(matches) {
    const first = matches.find((entry) => entry.matchKind === "name");
    if (!first) {
        return 0;
    }
    const length = Number.isFinite(first.matchLength) ? first.matchLength : 1;
    return first.matchIndex + length;
}

test("collectDetections exposes token metadata for configured tokenizer", () => {
    const matches = detectWithTokenizer(baseProfile, "cs-mock-whitespace");
    assert.ok(Number.isFinite(matches.tokenCount), "expected total token count on match collection");
    const first = matches.find((entry) => entry.matchKind === "name");
    assert.ok(first, "expected at least one name match");
    assert.ok(Number.isFinite(first.tokenIndex), "match should include token index");
    assert.ok(Number.isFinite(first.tokenLength) && first.tokenLength > 0, "match should include token length");
});

test("token-aware minimum filtering skips prior detections across tokenizers", () => {
    const whitespaceMatches = detectWithTokenizer(baseProfile, "cs-mock-whitespace");
    const minChar = extractMinChar(whitespaceMatches);

    const filteredWhitespace = detectWithTokenizer(baseProfile, "cs-mock-whitespace", { minIndex: minChar });
    const filteredBigrams = detectWithTokenizer(baseProfile, "cs-mock-bigram", { minIndex: minChar });

    assert.equal(filteredWhitespace.length, 1, "whitespace tokenizer should leave only the latest match");
    assert.equal(filteredBigrams.length, 1, "bigram tokenizer should leave only the latest match");
    assert.equal(filteredWhitespace[0].matchIndex, filteredBigrams[0].matchIndex, "filtered match should share char index");
});

test("distance scoring prefers the most recent detection regardless of tokenizer", () => {
    const whitespaceMatches = detectWithTokenizer(baseProfile, "cs-mock-whitespace");
    const bigramMatches = detectWithTokenizer(baseProfile, "cs-mock-bigram");

    const whitespaceWinner = getWinner(whitespaceMatches, 0, SAMPLE_TEXT.length, {
        rosterSet: null,
        rosterBonus: 0,
        rosterPriorityDropoff: 0,
        distancePenaltyWeight: 1,
        priorityMultiplier: 100,
        tokenLength: Number.isFinite(whitespaceMatches.tokenCount) ? whitespaceMatches.tokenCount : null,
    });

    const bigramWinner = getWinner(bigramMatches, 0, SAMPLE_TEXT.length, {
        rosterSet: null,
        rosterBonus: 0,
        rosterPriorityDropoff: 0,
        distancePenaltyWeight: 1,
        priorityMultiplier: 100,
        tokenLength: Number.isFinite(bigramMatches.tokenCount) ? bigramMatches.tokenCount : null,
    });

    assert.ok(whitespaceWinner, "expected a winner for whitespace tokenizer");
    assert.ok(bigramWinner, "expected a winner for bigram tokenizer");
    assert.equal(whitespaceWinner.name, bigramWinner.name, "winners should agree across tokenizers");
    assert.equal(whitespaceWinner.matchIndex, bigramWinner.matchIndex, "winner character index should match");
});
