import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const extensionSettingsStore = {};
globalThis.__extensionSettingsStore = extensionSettingsStore;

const { renderActiveCharacters } = await import("../src/ui/render/activeCharacters.js");
const { createScenePanelRefreshHandler } = await import("../src/ui/render/panel.js");
const { compileProfileRegexes } = await import("../src/detector-core.js");
const { getWinner, extensionName, adjustWindowForTrim, handleStream, remapMessageKey, state, collectScenePanelState, __testables } = await import("../index.js");

const {
    applySceneRosterUpdate,
    replaceLiveTesterOutputs,
    clearLiveTesterOutputs,
    resetSceneState,
    listRosterMembers,
    getCurrentSceneSnapshot,
    getRosterMembershipSnapshot,
} = await import("../src/core/state.js");

extensionSettingsStore[extensionName] = {
    enabled: true,
    profiles: { Default: {} },
    activeProfile: "Default",
    scorePresets: {},
    activeScorePreset: "",
    focusLock: { character: null },
};

test("getWinner respects minimum index when roster bias is present", () => {
    const rosterSet = new Set(["kotori"]);
    const matches = [
        { name: "Kotori", matchKind: "vocative", matchIndex: 10, priority: 2 },
        { name: "Shido", matchKind: "action", matchIndex: 120, priority: 3 },
    ];

    const withoutFilter = getWinner(matches, 0, 200, {
        rosterSet,
        rosterBonus: 150,
        distancePenaltyWeight: 0,
    });
    assert.equal(withoutFilter?.name, "Kotori");

    const filtered = getWinner(matches, 0, 200, {
        rosterSet,
        rosterBonus: 150,
        distancePenaltyWeight: 0,
        minIndex: 10,
    });
    assert.equal(filtered?.name, "Shido");
});

test("getWinner allows matches that extend beyond the processed boundary", () => {
    const matches = [
        { name: "Kotori", matchKind: "action", matchIndex: 95, matchLength: 6, priority: 3 },
        { name: "Shido", matchKind: "action", matchIndex: 20, matchLength: 5, priority: 3 },
    ];

    const winner = getWinner(matches, 0, 120, {
        distancePenaltyWeight: 0,
        minIndex: 97,
    });

    assert.equal(winner?.name, "Kotori");
});

test("adjustWindowForTrim tracks buffer offset and preserves prior indices", () => {
    const msgState = { processedLength: 0, lastAcceptedIndex: 42, bufferOffset: 0 };
    adjustWindowForTrim(msgState, 60, 120);
    assert.equal(msgState.bufferOffset, 60);
    assert.equal(msgState.processedLength, 180);
    assert.equal(msgState.lastAcceptedIndex, 42);
});

test("adjustWindowForTrim never shrinks processed length", () => {
    const msgState = { processedLength: 400, lastAcceptedIndex: 10, bufferOffset: 50 };
    adjustWindowForTrim(msgState, 30, 80);
    assert.equal(msgState.bufferOffset, 80);
    assert.equal(msgState.processedLength, 400);
});

test("adjustWindowForTrim grows processed length with new characters", () => {
    const msgState = { processedLength: 100, lastAcceptedIndex: -1, bufferOffset: 0 };
    adjustWindowForTrim(msgState, 0, 150);
    assert.equal(msgState.bufferOffset, 0);
    assert.equal(msgState.processedLength, 150);
});

test("handleStream logs focus lock status when locked", () => {
    const original$ = globalThis.$;
    const stubElement = {
        find: () => stubElement,
        toggleClass: () => stubElement,
        stop: () => stubElement,
        fadeIn: () => stubElement,
        fadeOut: (duration, callback) => {
            if (typeof callback === "function") {
                callback();
            }
            return stubElement;
        },
        removeClass: () => stubElement,
        text: () => stubElement,
        html: () => stubElement,
        prop: () => stubElement,
    };
    globalThis.$ = () => stubElement;

    const settings = extensionSettingsStore[extensionName];
    const previousFocusLock = settings.focusLock.character;
    const previousDebug = settings.profiles.Default.debug;

    settings.enabled = true;
    settings.focusLock.character = "Kotori";
    settings.profiles.Default.debug = true;
    state.focusLockNotice = { at: 0, character: null, displayName: null, message: null, event: null };

    const logs = [];
    const originalDebug = console.debug;
    console.debug = (...args) => { logs.push(args.join(" ")); };

    let noticeSnapshot = null;
    try {
        handleStream(0, "Hello");
        noticeSnapshot = { ...state.focusLockNotice };
    } finally {
        console.debug = originalDebug;
        settings.focusLock.character = previousFocusLock;
        settings.profiles.Default.debug = previousDebug;
        if (state.statusTimer) {
            clearTimeout(state.statusTimer);
            state.statusTimer = null;
        }
        state.focusLockNotice = { at: 0, character: null, displayName: null, message: null, event: null };
        if (typeof original$ === "undefined") {
            delete globalThis.$;
        } else {
            globalThis.$ = original$;
        }
    }

    assert.ok(logs.some(entry => entry.includes("Focus lock active;")));
    assert.ok(noticeSnapshot);
    assert.equal(noticeSnapshot.character, "kotori");
    assert.equal(noticeSnapshot.event.reason, "focus-lock");
    assert.equal(noticeSnapshot.event.matchKind, "focus-lock");
});

test("createMessageState carries roster TTL forward between messages", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.currentGenerationKey = null;

    const profile = { sceneRosterTTL: 5 };
    const previousState = {
        lastSubject: null,
        pendingSubject: null,
        pendingSubjectNormalized: null,
        sceneRoster: new Set(["kotori"]),
        outfitRoster: new Map([["kotori", { outfit: "casual" }]]),
        rosterTurns: new Map([["kotori", 3]]),
        defaultRosterTTL: 5,
        outfitTTL: 2,
    };

    state.perMessageStates.set("m0", previousState);

    const { state: newState, initialized, rosterCleared } = __testables.createMessageState(profile, "m1", { messageRole: "assistant" });

    assert.equal(initialized, true, "creating a fresh message state should flag initialization");
    assert.equal(rosterCleared, false, "roster should remain populated when TTL remains positive");
    assert.ok(newState.rosterTurns instanceof Map, "roster turns should be tracked per member");
    assert.equal(newState.rosterTurns.get("kotori"), 2, "roster turns should decrement from previous message");
    assert.equal(newState.defaultRosterTTL, 5, "default roster TTL should persist from the profile");
    assert.equal(newState.outfitTTL, 1, "outfit TTL should decrement from previous message");
    assert.deepEqual(Array.from(newState.sceneRoster), ["kotori"]);
});

test("createMessageState preserves roster TTL when message role is not assistant", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.currentGenerationKey = null;

    const profile = { sceneRosterTTL: 5 };
    const previousState = {
        lastSubject: null,
        pendingSubject: null,
        pendingSubjectNormalized: null,
        sceneRoster: new Set(["kotori"]),
        outfitRoster: new Map([["kotori", { outfit: "casual" }]]),
        rosterTurns: new Map([["kotori", 3]]),
        defaultRosterTTL: 5,
        outfitTTL: 2,
    };

    state.perMessageStates.set("m0", previousState);

    const { state: newState, rosterCleared } = __testables.createMessageState(profile, "m1", { messageRole: "system" });

    assert.equal(rosterCleared, false, "roster should remain populated for non-assistant messages");
    assert.ok(newState.rosterTurns instanceof Map, "roster turns should be tracked per member");
    assert.equal(newState.rosterTurns.get("kotori"), 3, "roster turns should remain unchanged");
    assert.equal(newState.defaultRosterTTL, 5, "default roster TTL should persist from the profile");
    assert.equal(newState.outfitTTL, 2, "outfit TTL should remain unchanged for non-assistant messages");
    assert.deepEqual(Array.from(newState.sceneRoster), ["kotori"]);
});

test("createMessageState leaves roster TTL untouched when message role is unknown", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.currentGenerationKey = null;

    const profile = { sceneRosterTTL: 4 };
    const previousState = {
        sceneRoster: new Set(["kotori"]),
        rosterTurns: new Map([["kotori", 2]]),
        defaultRosterTTL: 4,
        outfitTTL: 3,
    };

    state.perMessageStates.set("m0", previousState);

    const { state: newState } = __testables.createMessageState(profile, "m1", { messageRole: undefined });

    assert.ok(newState.rosterTurns instanceof Map);
    assert.equal(newState.rosterTurns.get("kotori"), 2, "roster TTL should not change without a known assistant role");
    assert.equal(newState.defaultRosterTTL, 4);
    assert.equal(newState.outfitTTL, 3);
});

test("applySceneRosterUpdate preserves per-member TTL values", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    const timestamp = Date.now();
    applySceneRosterUpdate({
        key: "m1",
        messageId: 1,
        roster: [
            { name: "Kotori", normalized: "kotori", turnsRemaining: 4, joinedAt: timestamp - 5000, lastSeenAt: timestamp },
            { name: "Honoka", normalized: "honoka", turnsRemaining: 1, joinedAt: timestamp - 3000, lastSeenAt: timestamp },
        ],
        updatedAt: timestamp,
    });

    const members = listRosterMembers();
    const kotori = members.find((entry) => entry.normalized === "kotori");
    const honoka = members.find((entry) => entry.normalized === "honoka");
    assert.equal(kotori?.turnsRemaining, 4);
    assert.equal(honoka?.turnsRemaining, 1);

    const scene = getCurrentSceneSnapshot();
    const roster = Array.isArray(scene.roster) ? scene.roster : [];
    const sceneKotori = roster.find((entry) => entry.normalized === "kotori");
    const sceneHonoka = roster.find((entry) => entry.normalized === "honoka");
    assert.equal(sceneKotori?.turnsRemaining, 4);
    assert.equal(sceneHonoka?.turnsRemaining, 1);
});

test("applySceneRosterUpdate refresh updates lastSeenAt when metadata is missing", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    const seed = Date.now();
    const joinedAt = seed - 10_000;
    const lastSeenAt = seed - 2_000;

    applySceneRosterUpdate({
        key: "m1",
        messageId: 1,
        roster: [
            {
                name: "Kotori",
                normalized: "kotori",
                joinedAt,
                lastSeenAt,
            },
        ],
        updatedAt: seed,
    });

    const refreshAt = seed + 5_000;

    applySceneRosterUpdate({
        key: "m2",
        messageId: 2,
        roster: ["Kotori"],
        updatedAt: refreshAt,
    });

    const members = listRosterMembers();
    const kotori = members.find((entry) => entry.normalized === "kotori");
    assert.ok(kotori, "expected Kotori to remain in roster after refresh");
    assert.equal(kotori?.joinedAt, joinedAt, "joinedAt should remain unchanged");
    assert.equal(kotori?.lastSeenAt, refreshAt, "lastSeenAt should refresh when metadata is omitted");

    const scene = getCurrentSceneSnapshot();
    const sceneKotori = scene.roster.find((entry) => entry.normalized === "kotori");
    assert.ok(sceneKotori, "expected Kotori snapshot entry");
    assert.equal(sceneKotori?.lastSeenAt, refreshAt, "scene snapshot should reflect refreshed lastSeenAt");
});

test("handleStream infers message key from token event payloads", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    const originalPerMessageStates = state.perMessageStates;
    const originalPerMessageBuffers = state.perMessageBuffers;
    const originalMessageQueue = state.messageKeyQueue;
    const originalCompiledRegexes = state.compiledRegexes;
    const originalGenerationKey = state.currentGenerationKey;

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.messageKeyQueue = [];
    state.currentGenerationKey = null;
    state.compiledRegexes = {};

    const settings = extensionSettingsStore[extensionName];
    const originalProfile = settings.profiles.Default;
    const originalEnabled = settings.enabled;
    const originalFocusLock = settings.focusLock.character;

    settings.enabled = true;
    settings.focusLock.character = null;
    settings.profiles.Default = { ...originalProfile };

    try {
        handleStream({ messageId: 321, token: "Kotori" });

        assert.equal(state.currentGenerationKey, "m321");
        assert.ok(state.perMessageStates.has("m321"));
        assert.equal(state.perMessageBuffers.get("m321"), "Kotori");
    } finally {
        settings.profiles.Default = originalProfile;
        settings.enabled = originalEnabled;
        settings.focusLock.character = originalFocusLock;
        state.currentGenerationKey = originalGenerationKey;
        state.perMessageStates = originalPerMessageStates;
        state.perMessageBuffers = originalPerMessageBuffers;
        state.messageKeyQueue = originalMessageQueue;
        state.compiledRegexes = originalCompiledRegexes;
    }
});

test("handleStream ignores manual generation tokens when inferring message key", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    const originalPerMessageStates = state.perMessageStates;
    const originalPerMessageBuffers = state.perMessageBuffers;
    const originalMessageQueue = state.messageKeyQueue;
    const originalCompiledRegexes = state.compiledRegexes;
    const originalGenerationKey = state.currentGenerationKey;

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.messageKeyQueue = [];
    state.currentGenerationKey = null;
    state.compiledRegexes = {};

    const settings = extensionSettingsStore[extensionName];
    const originalProfile = settings.profiles.Default;
    const originalEnabled = settings.enabled;
    const originalFocusLock = settings.focusLock.character;

    settings.enabled = true;
    settings.focusLock.character = null;
    settings.profiles.Default = { ...originalProfile };

    try {
        handleStream({ token: "Kotori", generationType: "manual" });

        assert.equal(state.currentGenerationKey, null, "manual generation tokens should not set a stream key");
        assert.equal(state.perMessageStates.size, 0, "no per-message state should be created for manual tokens");
        assert.equal(state.perMessageBuffers.size, 0, "no per-message buffer should be seeded for manual tokens");
    } finally {
        settings.profiles.Default = originalProfile;
        settings.enabled = originalEnabled;
        settings.focusLock.character = originalFocusLock;
        state.currentGenerationKey = originalGenerationKey;
        state.perMessageStates = originalPerMessageStates;
        state.perMessageBuffers = originalPerMessageBuffers;
        state.messageKeyQueue = originalMessageQueue;
        state.compiledRegexes = originalCompiledRegexes;
    }
});

test("handleStream ignores non-assistant streaming payloads", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.currentGenerationKey = null;
    state.recentDecisionEvents = [];

    globalThis.__mockContext = {
        chat: [
            { mesId: 101, mes: "User says hi", is_user: true },
            { mesId: 102, mes: "System directive", is_system: true },
            { mesId: 103, mes: "Narrator note", extra: { type: "narrator" } },
        ],
    };

    const initialKey = state.currentGenerationKey;
    const initialBuffersSize = state.perMessageBuffers.size;
    const initialStatesSize = state.perMessageStates.size;
    const initialEventsLength = state.recentDecisionEvents.length;

    try {
        handleStream({ token: "ignored", role: "user", key: "m101" });
        handleStream({ token: "ignored", key: "m101" });
        handleStream({ token: "ignored", role: "system", key: "m102" });
        handleStream({ token: "ignored", key: "m102" });
        handleStream({ token: "ignored", role: "narrator", key: "m103" });
        handleStream({ token: "ignored", key: "m103" });
    } finally {
        delete globalThis.__mockContext;
    }

    assert.equal(state.currentGenerationKey, initialKey);
    assert.equal(state.perMessageBuffers.size, initialBuffersSize);
    assert.equal(state.perMessageStates.size, initialStatesSize);
    assert.equal(state.recentDecisionEvents.length, initialEventsLength);
});

test("handleStream records veto phrase and recent events", () => {
    const original$ = globalThis.$;
    const statusMessages = [];
    const stubElement = {
        find: () => stubElement,
        toggleClass: () => stubElement,
        stop: () => stubElement,
        fadeIn: () => stubElement,
        fadeOut: (duration, callback) => {
            if (typeof callback === "function") {
                callback();
            }
            return stubElement;
        },
        removeClass: () => stubElement,
        text: (value) => {
            if (typeof value === "string") {
                statusMessages.push(value);
            }
            return stubElement;
        },
        html: (value) => {
            if (typeof value === "string") {
                statusMessages.push(value);
            }
            return stubElement;
        },
        prop: () => stubElement,
    };
    globalThis.$ = () => stubElement;

    const settings = extensionSettingsStore[extensionName];
    settings.enabled = true;
    settings.profiles.Default = settings.profiles.Default || {};
    settings.focusLock.character = null;

    state.recentDecisionEvents = [];
    state.lastVetoMatch = null;
    state.compiledRegexes = { vetoRegex: /OOC:/i, effectivePatterns: ["Kotori"] };
    state.currentGenerationKey = "live";
    state.perMessageStates = new Map([["live", {
        lastAcceptedName: null,
        lastAcceptedTs: 0,
        vetoed: false,
        lastSubject: null,
        lastSubjectNormalized: null,
        pendingSubject: null,
        pendingSubjectNormalized: null,
        sceneRoster: new Set(),
        outfitRoster: new Map(),
        rosterTurns: new Map(),
        defaultRosterTTL: 5,
        outfitTTL: 5,
        processedLength: 0,
        lastAcceptedIndex: -1,
        bufferOffset: 0,
    }]]);
    state.perMessageBuffers = new Map([["live", ""]]);

    try {
        handleStream("OOC:");
    } finally {
        if (typeof original$ === "undefined") {
            delete globalThis.$;
        } else {
            globalThis.$ = original$;
        }
    }

    assert.equal(state.perMessageStates.get("live").vetoed, true, "message state should be marked vetoed");
    assert.ok(state.lastVetoMatch);
    assert.equal(state.lastVetoMatch.phrase, "OOC:");
    assert.ok(statusMessages.some(message => message.includes("Veto phrase")));
    const vetoEvents = state.recentDecisionEvents.filter(event => event.type === "veto");
    assert.equal(vetoEvents.length > 0, true, "expected veto event to be recorded");
    assert.equal(vetoEvents[vetoEvents.length - 1].match, "OOC:");
});

test("handleStream merges incremental matches without duplication", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.perMessageStates = new Map();
    state.perMessageBuffers = new Map();
    state.messageStats = new Map();
    state.messageMatches = new Map();
    state.topSceneRanking = new Map();
    state.topSceneRankingUpdatedAt = new Map();
    state.currentGenerationKey = null;

    const settings = extensionSettingsStore[extensionName];
    const originalProfile = settings.profiles.Default;
    const originalCompiled = state.compiledRegexes;
    const original$ = globalThis.$;

    const stubElement = {
        length: 0,
        find: () => stubElement,
        filter: () => stubElement,
        first: () => stubElement,
        append: () => stubElement,
        insertAfter: () => stubElement,
        text: () => stubElement,
        html: () => stubElement,
        toggleClass: () => stubElement,
        stop: () => stubElement,
        fadeIn: () => stubElement,
        fadeOut: (duration, callback) => {
            if (typeof callback === "function") {
                callback();
            }
            return stubElement;
        },
        removeClass: () => stubElement,
        addClass: () => stubElement,
        prop: () => stubElement,
        attr: () => stubElement,
        on: () => stubElement,
        off: () => stubElement,
    };
    globalThis.$ = () => stubElement;

    settings.profiles.Default = {
        patterns: ["Kotori", "Shido"],
        detectAttribution: false,
        detectAction: false,
        detectGeneral: false,
        detectPronoun: false,
        detectVocative: false,
        detectPossessive: false,
    };

    const compiled = compileProfileRegexes(settings.profiles.Default);
    state.compiledRegexes = { ...compiled.regexes, effectivePatterns: compiled.effectivePatterns };

    try {
        const profile = settings.profiles.Default;
        __testables.createMessageState(profile, "m0", { messageRole: "assistant" });
        state.currentGenerationKey = "m0";

        const firstChunk = "Kotori: Hello there.\n";
        handleStream(0, firstChunk);

        const key = state.currentGenerationKey;
        const cacheAfterFirst = state.messageMatches.get(key);
        assert.ok(cacheAfterFirst, "expected cache to be created for streaming message");
        assert.equal(cacheAfterFirst.matches.length, 1, "initial chunk should record a single match");
        assert.equal(cacheAfterFirst.matches[0].name, "Kotori");
        assert.equal(cacheAfterFirst.matches[0].absoluteIndex, 0, "first match should start at index 0");

        const statsAfterFirst = state.messageStats.get(key);
        assert.equal(statsAfterFirst.get("Kotori"), 1);
        assert.equal(statsAfterFirst.get("Shido") || 0, 0);

        const secondChunk = "Shido: Hey there.\n";
        handleStream(0, secondChunk);

        const cacheAfterSecond = state.messageMatches.get(key);
        assert.equal(cacheAfterSecond.matches.length, 2, "second chunk should add a new match without duplicating prior ones");
        assert.deepEqual(
            cacheAfterSecond.matches.map((match) => match.name),
            ["Kotori", "Shido"],
        );
        assert.ok(
            cacheAfterSecond.matches[1].absoluteIndex >= firstChunk.length - 1,
            "absolute index should account for previously processed characters",
        );

        const statsAfterSecond = state.messageStats.get(key);
        assert.equal(statsAfterSecond.get("Kotori"), 1);
        assert.equal(statsAfterSecond.get("Shido"), 1);

        const ranking = state.topSceneRanking.get(key) || [];
        assert.equal(ranking.length, 2, "ranking should include both detected characters");
        const buffer = state.perMessageBuffers.get(key) || "";
        assert.equal(cacheAfterSecond.processedAbsolute, buffer.length - 1);

        handleStream(0, "");
        const cacheAfterEmpty = state.messageMatches.get(key);
        assert.equal(cacheAfterEmpty.matches.length, 2, "empty chunk should not mutate cached matches");
    } finally {
        settings.profiles.Default = originalProfile;
        state.compiledRegexes = originalCompiled;
        if (state.statusTimer) {
            clearTimeout(state.statusTimer);
            state.statusTimer = null;
        }
        if (typeof original$ === "undefined") {
            globalThis.$ = () => stubElement;
        } else {
            globalThis.$ = original$;
        }
        state.currentGenerationKey = null;
        state.perMessageStates = new Map();
        state.perMessageBuffers = new Map();
        state.messageStats = new Map();
        state.messageMatches = new Map();
        state.topSceneRanking = new Map();
        state.topSceneRankingUpdatedAt = new Map();
    }
});

test("collectScenePanelState analytics updatedAt reflects latest scene activity", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.recentDecisionEvents = [];
    state.topSceneRanking = new Map();
    state.topSceneRankingUpdatedAt = new Map();
    state.messageStats = new Map();
    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.latestTopRanking = { bufKey: null, ranking: [], fullRanking: [], updatedAt: 0 };
    state.currentGenerationKey = null;

    const messageKey = "m1";
    const rankingTimestamp = 4200;
    const testerTimestamp = 4800;
    const eventTimestamp = 5100;
    const rankingEntry = {
        name: "Kotori",
        normalized: "kotori",
        count: 3,
        bestPriority: 1,
        inSceneRoster: true,
        score: 100,
    };

    state.topSceneRanking.set(messageKey, [rankingEntry]);
    state.topSceneRankingUpdatedAt.set(messageKey, rankingTimestamp);
    state.latestTopRanking = {
        bufKey: messageKey,
        ranking: [rankingEntry],
        fullRanking: [rankingEntry],
        updatedAt: rankingTimestamp,
    };
    state.messageStats.set(messageKey, new Map([["kotori", 3]]));
    state.perMessageBuffers.set(messageKey, "Kotori waves.");
    state.recentDecisionEvents = [{ type: "switch", messageKey, timestamp: eventTimestamp }];

    applySceneRosterUpdate({ key: messageKey, roster: ["Kotori"], updatedAt: rankingTimestamp - 500 });
    replaceLiveTesterOutputs([], { roster: ["Kotori"], timestamp: testerTimestamp });

    const panelState = collectScenePanelState();
    assert.equal(panelState.analytics.updatedAt, eventTimestamp);

    state.recentDecisionEvents = [];
    const panelWithoutEvents = collectScenePanelState();
    assert.equal(panelWithoutEvents.analytics.updatedAt, testerTimestamp);
});

test("collectScenePanelState ignores tester-sourced refresh requests", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.recentDecisionEvents = [];
    state.messageStats = new Map();
    state.topSceneRanking = new Map();
    state.topSceneRankingUpdatedAt = new Map();
    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.latestTopRanking = { bufKey: null, ranking: [], fullRanking: [], updatedAt: 0 };
    state.currentGenerationKey = null;

    const baseline = collectScenePanelState();
    assert.equal(Array.isArray(baseline.analytics.events) ? baseline.analytics.events.length : 0, 0);

    const messageKey = "m1";
    state.recentDecisionEvents = [
        { type: "switch", messageKey, name: "Kotori", normalized: "kotori" },
    ];
    state.messageStats = new Map([[messageKey, { updatedAt: Date.now() }]]);

    const testerSnapshot = collectScenePanelState({ source: "tester" });
    assert.strictEqual(testerSnapshot, baseline);
    assert.equal(testerSnapshot.analytics.events.length, 0);

    const refreshed = collectScenePanelState();
    assert.notStrictEqual(refreshed, baseline);
    assert.equal(refreshed.analytics.events.length, 1);
});

test("collectScenePanelState defers stream switch until new data is available", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.recentDecisionEvents = [{ type: "switch", messageKey: "m1", timestamp: 1000 }];
    state.topSceneRanking = new Map();
    state.topSceneRankingUpdatedAt = new Map();
    state.messageStats = new Map([["m1", new Map([["kotori", 2]])]]);
    state.perMessageBuffers = new Map([
        ["m1", "Kotori waves."],
        ["live", ""],
    ]);
    state.perMessageStates = new Map();
    state.latestTopRanking = { bufKey: "m1", ranking: [], fullRanking: [], updatedAt: 1000 };
    state.currentGenerationKey = "live";

    const initialPanelState = collectScenePanelState();
    assert.equal(initialPanelState.analytics.messageKey, "m1");
    assert.equal(initialPanelState.analytics.buffer, "Kotori waves.");
    assert.equal(initialPanelState.isStreaming, false);

    state.perMessageBuffers.set("live", "Kotori smiles.");
    state.recentDecisionEvents.push({ type: "switch", messageKey: "live", timestamp: 2000 });

    const streamingPanelState = collectScenePanelState();
    assert.equal(streamingPanelState.analytics.messageKey, "live");
    assert.equal(streamingPanelState.analytics.buffer, "Kotori smiles.");
    assert.equal(streamingPanelState.isStreaming, true);
});

test("scene panel refresh preserves roster timestamps when already current", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    const seedTimestamp = 9876;

    applySceneRosterUpdate({
        key: "m1",
        messageId: 1,
        roster: [
            { name: "Kotori", normalized: "kotori", joinedAt: seedTimestamp - 100, lastSeenAt: seedTimestamp },
        ],
        updatedAt: seedTimestamp,
    });

    let restoreInvocations = 0;
    let renderRequested = false;
    let rerenderCount = 0;
    const statusMessages = [];

    const handler = createScenePanelRefreshHandler({
        restoreLatestSceneOutcome: () => {
            restoreInvocations += 1;
            applySceneRosterUpdate({ key: "m1", messageId: 1, roster: ["Kotori"], updatedAt: Date.now() });
            return true;
        },
        requestScenePanelRender: () => {
            renderRequested = true;
        },
        rerenderScenePanelLayer: () => {
            rerenderCount += 1;
        },
        showStatus: (message) => {
            statusMessages.push(message);
        },
        getCurrentSceneSnapshot,
        getLatestStoredSceneTimestamp: () => seedTimestamp,
    });

    handler({ preventDefault() {} });

    const scene = getCurrentSceneSnapshot();
    assert.equal(scene.updatedAt, seedTimestamp, "scene snapshot timestamp should remain unchanged");

    const rosterSnapshot = getRosterMembershipSnapshot();
    assert.equal(rosterSnapshot.updatedAt, seedTimestamp, "roster snapshot timestamp should remain unchanged");

    assert.equal(restoreInvocations, 0, "refresh handler should skip restoring when timestamps match");
    assert.equal(renderRequested, false, "manual render should not be requested when already current");
    assert.equal(statusMessages[0], "Scene panel refreshed.", "refresh handler should still surface status feedback");
    assert.equal(rerenderCount, 1, "refresh handler should rerender the active layer once");
});

test("remapMessageKey retargets recent decision events for rendered messages", () => {
    const settings = extensionSettingsStore[extensionName];
    settings.session = settings.session || {};

    const sharedEvent = { type: "switch", messageKey: "live", name: "Kotori" };
    state.recentDecisionEvents = [
        sharedEvent,
        { type: "switch", messageKey: "m7", name: "Origami" },
    ];
    state.lastTesterReport = { events: [sharedEvent] };
    settings.session.recentDecisionEvents = [sharedEvent];

    remapMessageKey("live", "m101");

    assert.equal(state.recentDecisionEvents[0].messageKey, "m101");
    assert.equal(state.lastTesterReport.events[0].messageKey, "m101");
    assert.equal(settings.session.recentDecisionEvents[0].messageKey, "m101");
});

function createStubFragment() {
    return {
        nodeType: 11,
        children: [],
        appendChild(child) {
            if (!child) {
                return child;
            }
            if (child.parentNode && typeof child.parentNode.removeChild === "function") {
                child.parentNode.removeChild(child);
            }
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
    };
}

function createStubElement(tagName) {
    return {
        tagName: String(tagName || "").toUpperCase(),
        className: "",
        textContent: "",
        dataset: {},
        attributes: {},
        children: [],
        parentNode: null,
        appendChild(child) {
            if (!child) {
                return child;
            }
            if (child.nodeType === 11 && Array.isArray(child.children)) {
                const nodes = child.children.slice();
                child.children.length = 0;
                nodes.forEach((grandchild) => {
                    if (grandchild) {
                        this.appendChild(grandchild);
                    }
                });
                return child;
            }
            if (child.parentNode && typeof child.parentNode.removeChild === "function") {
                child.parentNode.removeChild(child);
            }
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        removeChild(child) {
            const index = this.children.indexOf(child);
            if (index >= 0) {
                this.children.splice(index, 1);
                if (child) {
                    child.parentNode = null;
                }
            }
            return child;
        },
        get firstChild() {
            return this.children[0] || null;
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
    };
}

function createStubDocument() {
    return {
        createElement(tagName) {
            return createStubElement(tagName);
        },
        createDocumentFragment() {
            return createStubFragment();
        },
    };
}

test("collectScenePanelState attaches recent events for active character rendering", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    state.recentDecisionEvents = [];
    state.topSceneRanking = new Map();
    state.topSceneRankingUpdatedAt = new Map();
    state.messageStats = new Map();
    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.latestTopRanking = { bufKey: null, ranking: [], fullRanking: [], updatedAt: 0 };
    state.currentGenerationKey = null;

    const now = Date.now();
    const messageKey = "m501";
    const normalized = "kotori";
    const rankingEntry = {
        name: "Kotori",
        normalized,
        count: 5,
        score: 99,
        inSceneRoster: true,
    };

    state.currentGenerationKey = messageKey;
    state.perMessageBuffers.set(messageKey, "");
    state.messageStats.set(messageKey, new Map());
    state.topSceneRanking.set(messageKey, [rankingEntry]);
    state.topSceneRankingUpdatedAt.set(messageKey, now - 500);
    state.latestTopRanking = {
        bufKey: messageKey,
        ranking: [rankingEntry],
        fullRanking: [rankingEntry],
        updatedAt: now - 500,
    };

    const eventOne = {
        type: "switch",
        messageKey,
        normalized,
        matchKind: "name",
        charIndex: 0,
        timestamp: now - 3000,
    };
    const eventTwo = {
        type: "focus",
        messageKey,
        normalized,
        matchKind: "focus-lock",
        charIndex: 0,
        timestamp: now - 2000,
    };
    const eventThree = {
        type: "switch",
        messageKey,
        normalized,
        matchKind: "name",
        charIndex: 0,
        timestamp: now - 1000,
    };

    state.recentDecisionEvents = [eventOne, eventTwo, eventThree];

    const panelState = collectScenePanelState();

    assert.ok(Array.isArray(panelState.ranking));
    assert.equal(panelState.ranking.length, 1);
    assert.ok(Array.isArray(panelState.ranking[0].events));
    assert.equal(panelState.ranking[0].events.length, 2);
    assert.equal(panelState.ranking[0].events[0].timestamp, eventTwo.timestamp);
    assert.equal(panelState.ranking[0].events[1].timestamp, eventThree.timestamp);

    const previousDocument = globalThis.document;
    const stubDocument = createStubDocument();
    globalThis.document = stubDocument;

    try {
        const host = createStubElement("section");
        renderActiveCharacters({ el: host }, panelState);
        assert.equal(host.children.length > 0, true, "expected at least one rendered card");
        const card = host.children.find((child) => child.tagName === "ARTICLE");
        assert.ok(card, "expected ranking card element");
        const eventRow = card.children.find((child) => child.className === "cs-scene-active__event");
        assert.ok(eventRow, "expected event row to render for recent event");
        assert.ok(eventRow.textContent.includes("switch"), "expected event text to include event type");
    } finally {
        if (typeof previousDocument === "undefined") {
            delete globalThis.document;
        } else {
            globalThis.document = previousDocument;
        }
    }
});

test("recordDecisionEvent retains switch events when skip flood occurs", () => {
    resetSceneState();
    clearLiveTesterOutputs();

    const { recordDecisionEvent } = __testables;

    state.recentDecisionEvents = [];
    state.currentGenerationKey = "m777";

    const baseTimestamp = Date.now();
    recordDecisionEvent({
        type: "switch",
        name: "Kotori",
        folder: "Kotori",
        timestamp: baseTimestamp,
    });
    recordDecisionEvent({
        type: "switch",
        name: "Tohka",
        folder: "Tohka",
        timestamp: baseTimestamp + 1,
    });

    for (let index = 0; index < 40; index += 1) {
        recordDecisionEvent({
            type: "skipped",
            name: `Skip${index}`,
            reason: "repeat-suppression",
            timestamp: baseTimestamp + 2 + index,
        });
    }

    const switchEvents = state.recentDecisionEvents.filter((event) => event?.type === "switch");
    assert.equal(switchEvents.length, 2);
    assert.ok(state.recentDecisionEvents.length <= 25);
    const names = switchEvents.map((event) => event?.name).filter(Boolean);
    assert.ok(names.includes("Kotori"));
    assert.ok(names.includes("Tohka"));
});
