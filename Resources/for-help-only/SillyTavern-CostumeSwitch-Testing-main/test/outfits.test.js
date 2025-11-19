import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const extensionSettingsStore = {};
globalThis.__extensionSettingsStore = extensionSettingsStore;

const {
    resolveOutfitForMatch,
    evaluateSwitchDecision,
    rebuildMappingLookup,
    buildVariantFolderPath,
    extensionName,
} = await import("../index.js");

import { normalizeProfile } from "../profile-utils.js";

const PROFILE_BASE = {
    enableOutfits: true,
    sceneRosterTTL: 3,
    globalCooldownMs: 0,
    perTriggerCooldownMs: 0,
    failedTriggerCooldownMs: 0,
    mappings: [],
};

function setupProfile(overrides = {}) {
    const profile = normalizeProfile({
        ...PROFILE_BASE,
        ...overrides,
    }, PROFILE_BASE);
    extensionSettingsStore[extensionName] = {
        enabled: true,
        profiles: { Default: profile },
        activeProfile: "Default",
        scorePresets: {},
        activeScorePreset: "", 
        focusLock: { character: null },
    };
    rebuildMappingLookup(profile);
    return profile;
}

test("resolveOutfitForMatch selects variant by trigger match", () => {
    const profile = setupProfile({
        mappings: [
            {
                name: "Alice",
                defaultFolder: "alice/base",
                outfits: [
                    { folder: "alice/battle", triggers: ["sword"] },
                    { folder: "alice/formal", triggers: ["gown"] },
                ],
            },
        ],
    });

    const result = resolveOutfitForMatch("Alice", {
        profile,
        context: { text: "Alice raises her sword before the duel." },
    });

    assert.equal(result.folder, "alice/battle");
    assert.equal(result.reason, "trigger-match");
    assert.equal(result.trigger.pattern, "sword");
});

test("resolveOutfitForMatch honors matchKinds filters", () => {
    const profile = setupProfile({
        mappings: [
            {
                name: "Alex",
                defaultFolder: "alex/base",
                outfits: [
                    { folder: "alex/dialogue", matchKinds: ["speaker", "vocative"] },
                    { folder: "alex/action", matchKinds: ["action"] },
                ],
            },
        ],
    });

    const speaker = resolveOutfitForMatch("Alex", {
        profile,
        context: { matchKind: "speaker" },
    });
    assert.equal(speaker.folder, "alex/dialogue");

    const action = resolveOutfitForMatch("Alex", {
        profile,
        context: { matchKind: "action" },
    });
    assert.equal(action.folder, "alex/action");

    const fallback = resolveOutfitForMatch("Alex", {
        profile,
        context: { matchKind: "pronoun" },
    });
    assert.equal(fallback.folder, "alex/base");
    assert.equal(fallback.reason, "default-folder");
});

test("resolveOutfitForMatch respects awareness requirements", () => {
    const profile = setupProfile({
        mappings: [
            {
                name: "Bob",
                defaultFolder: "bob/base",
                outfits: [
                    { folder: "bob/solo", triggers: [], awareness: { excludes: ["Alice"] } },
                    { folder: "bob/team", triggers: [], awareness: { requires: ["Alice"] } },
                ],
            },
        ],
    });

    const roster = new Set(["alice"]);
    const result = resolveOutfitForMatch("Bob", {
        profile,
        context: { roster },
    });

    assert.equal(result.folder, "bob/team");
    const fallback = resolveOutfitForMatch("Bob", {
        profile,
        context: { roster: new Set(["charlie"]) },
    });

    assert.equal(fallback.folder, "bob/solo");
});

test("resolveOutfitForMatch prioritizes higher-priority variants", () => {
    const profile = setupProfile({
        mappings: [
            {
                name: "Eve",
                defaultFolder: "eve/base",
                outfits: [
                    { folder: "eve/low", triggers: ["duel"], priority: 1 },
                    { folder: "eve/high", triggers: ["duel"], priority: 5 },
                ],
            },
        ],
    });

    const result = resolveOutfitForMatch("Eve", {
        profile,
        context: { text: "Eve prepares for the duel." },
    });

    assert.equal(result.folder, "eve/high");
    assert.equal(result.reason, "trigger-match");
});

test("resolveOutfitForMatch prefers triggered variants over passive matches", () => {
    const profile = setupProfile({
        mappings: [
            {
                name: "Finn",
                defaultFolder: "finn/base",
                outfits: [
                    { folder: "finn/default", priority: 0 },
                    { folder: "finn/triggered", triggers: ["signal"], priority: 0 },
                ],
            },
        ],
    });

    const result = resolveOutfitForMatch("Finn", {
        profile,
        context: { text: "A signal flare bursts overhead." },
    });

    assert.equal(result.folder, "finn/triggered");
});

test("resolveOutfitForMatch breaks ties using awareness specificity", () => {
    const profile = setupProfile({
        mappings: [
            {
                name: "Gale",
                defaultFolder: "gale/base",
                outfits: [
                    { folder: "gale/general", triggers: ["signal"], priority: 2 },
                    { folder: "gale/aware", triggers: ["signal"], priority: 2, awareness: { requires: ["Nora"] } },
                ],
            },
        ],
    });

    const roster = new Set(["nora"]);
    const result = resolveOutfitForMatch("Gale", {
        profile,
        context: { text: "Another signal is sent.", roster },
    });

    assert.equal(result.folder, "gale/aware");
});

test("buildVariantFolderPath roots selections beneath the default folder", () => {
    const mapping = { name: "Tohka Yatogami", defaultFolder: "Tohka" };
    assert.equal(buildVariantFolderPath(mapping, "Adonai Melek"), "Tohka/Adonai Melek");
    assert.equal(buildVariantFolderPath(mapping, "Tohka/Adonai Melek"), "Tohka/Adonai Melek");

    const nested = { name: "Alice", defaultFolder: "Series/Alice" };
    assert.equal(buildVariantFolderPath(nested, "Battle"), "Series/Alice/Battle");
    assert.equal(buildVariantFolderPath(nested, "Series/Alice/Casual"), "Series/Alice/Casual");

    assert.equal(buildVariantFolderPath("Charlie", "Variant"), "Charlie/Variant");
});

test("evaluateSwitchDecision caches outfit selections", () => {
    const profile = setupProfile({
        perTriggerCooldownMs: 0,
        mappings: [
            {
                name: "Cara",
                defaultFolder: "cara/base",
                outfits: [
                    { folder: "cara/action", triggers: ["blade"] },
                ],
            },
        ],
    });

    const runtime = {
        lastIssuedCostume: null,
        lastIssuedFolder: null,
        lastSwitchTimestamp: 0,
        lastTriggerTimes: new Map(),
        failedTriggerTimes: new Map(),
        characterOutfits: new Map(),
    };

    const first = evaluateSwitchDecision("Cara", {
        matchKind: "action",
        context: { text: "Cara draws her blade." },
    }, runtime, 1000);

    assert.ok(first.shouldSwitch, "first decision should switch");
    assert.equal(first.folder, "cara/action");
    runtime.lastIssuedCostume = first.name;
    runtime.lastIssuedFolder = first.folder;
    runtime.lastSwitchTimestamp = first.now;
    runtime.lastTriggerTimes.set(first.folder, first.now);
    runtime.characterOutfits.set(first.name.toLowerCase(), { folder: first.folder, updatedAt: first.now });

    const second = evaluateSwitchDecision("Cara", {
        matchKind: "action",
        context: { text: "Cara keeps her blade ready." },
    }, runtime, 200);

    assert.equal(second.shouldSwitch, false);
    assert.equal(second.reason, "outfit-unchanged");
});

test("per-trigger cooldown still applies with outfits", () => {
    const profile = setupProfile({
        perTriggerCooldownMs: 1000,
        mappings: [
            {
                name: "Dana",
                defaultFolder: "dana/base",
                outfits: [
                    { folder: "dana/combat", triggers: ["axe"] },
                ],
            },
        ],
    });

    const runtime = {
        lastIssuedCostume: null,
        lastIssuedFolder: null,
        lastSwitchTimestamp: 0,
        lastTriggerTimes: new Map(),
        failedTriggerTimes: new Map(),
        characterOutfits: new Map(),
    };

    const first = evaluateSwitchDecision("Dana", {
        matchKind: "action",
        context: { text: "Dana hefts her axe." },
    }, runtime, 1000);

    assert.ok(first.shouldSwitch, first.reason);
    runtime.lastIssuedCostume = first.name;
    runtime.lastIssuedFolder = first.folder;
    runtime.lastSwitchTimestamp = first.now;
    runtime.lastTriggerTimes.set(first.folder, first.now);
    runtime.characterOutfits.set(first.name.toLowerCase(), { folder: first.folder, updatedAt: first.now });

    runtime.characterOutfits.clear();
    runtime.lastIssuedFolder = null;

    const second = evaluateSwitchDecision("Dana", {
        matchKind: "action",
        context: { text: "Dana twirls her axe." },
    }, runtime, 1400);

    assert.equal(second.shouldSwitch, false);
    assert.equal(second.reason, "per-trigger-cooldown");
});

test("evaluateSwitchDecision switches characters sharing the same outfit folder", () => {
    setupProfile({
        mappings: [
            { name: "Hero", defaultFolder: "shared/outfit", outfits: [] },
            { name: "Rival", defaultFolder: "shared/outfit", outfits: [] },
        ],
    });

    const runtime = {
        lastIssuedCostume: "Hero",
        lastIssuedFolder: "shared/outfit",
        lastSwitchTimestamp: 0,
        lastTriggerTimes: new Map([["shared/outfit", 1000]]),
        failedTriggerTimes: new Map(),
        characterOutfits: new Map([["hero", { folder: "shared/outfit", updatedAt: 1000 }]]),
    };

    const decision = evaluateSwitchDecision("Rival", { matchKind: "action" }, runtime, 2000);

    assert.equal(decision.shouldSwitch, true, decision.reason);
    assert.equal(decision.name, "Rival");
    assert.equal(decision.folder, "shared/outfit");
});
