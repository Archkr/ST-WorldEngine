import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const extensionSettingsStore = globalThis.__extensionSettingsStore || (globalThis.__extensionSettingsStore = {});

const { simulateTesterStream, state, extensionName, updateMessageAnalytics } = await import("../index.js");
const {
    getLiveTesterOutputsSnapshot,
    clearLiveTesterOutputs,
} = await import("../src/core/state.js");
const { compileProfileRegexes, collectDetections } = await import("../src/detector-core.js");

const baseSettings = {
    enabled: true,
    profiles: {},
    activeProfile: "Test",
    scorePresets: {},
    activeScorePreset: "",
    focusLock: { character: null },
};

const baseProfile = {
    patterns: ["Kotori", "Shido"],
    ignorePatterns: [],
    vetoPatterns: [],
    defaultCostume: "",
    debug: false,
    globalCooldownMs: 120000,
    perTriggerCooldownMs: 0,
    failedTriggerCooldownMs: 0,
    maxBufferChars: 24,
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
    pronounVocabulary: ["he", "she", "they"],
    attributionVerbs: ["said"],
    actionVerbs: ["moved"],
    detectionBias: 0,
    enableSceneRoster: true,
    sceneRosterTTL: 5,
    prioritySpeakerWeight: 5,
    priorityAttributionWeight: 4,
    priorityActionWeight: 3,
    priorityPronounWeight: 2,
    priorityVocativeWeight: 2,
    priorityPossessiveWeight: 1,
    priorityNameWeight: 0,
    rosterBonus: 150,
    rosterPriorityDropoff: 0.5,
    distancePenaltyWeight: 1,
};

function setupProfile(overrides = {}) {
    const profile = { ...baseProfile, ...overrides };
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        profiles: { Test: profile },
        session: {},
    };
    const compiled = compileProfileRegexes(profile, {
        unicodeWordPattern: "[\\\\p{L}\\\\p{M}\\\\p{N}_]",
        defaultPronouns: profile.pronounVocabulary,
    });
    state.compiledRegexes = { ...compiled.regexes, effectivePatterns: compiled.effectivePatterns };
    return profile;
}

function createMessageState(profile) {
    return {
        lastAcceptedName: null,
        lastAcceptedTs: 0,
        vetoed: false,
        lastSubject: null,
        lastSubjectNormalized: null,
        pendingSubject: null,
        pendingSubjectNormalized: null,
        sceneRoster: new Set(),
        rosterTTL: profile.sceneRosterTTL,
        outfitRoster: new Map(),
        outfitTTL: profile.sceneRosterTTL,
        processedLength: 0,
        lastAcceptedIndex: -1,
        bufferOffset: 0,
        detectionContext: {
            lastProcessedAbsolute: -1,
            quoteState: {
                ranges: [],
                stack: [],
                windowOffset: 0,
                lastIndex: -1,
            },
            matchCache: {
                matches: [],
                processedAbsolute: -1,
                windowOffset: 0,
            },
            metrics: {
                incrementalRuns: 0,
                incrementalChars: 0,
                fullRuns: 0,
                fullChars: 0,
            },
        },
    };
}

test("simulateTesterStream advances indices without redundant skips", () => {
    const profile = setupProfile();
    const bufKey = "tester";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    const text = "Kotori leads the charge, Kotori steadies herself, and Shido watches closely.";
    const result = simulateTesterStream(text, profile, bufKey);

    const events = result.events.filter(event => event.type !== "veto");
    assert.ok(events.length >= 3, "expected at least three detection events");

    const indices = events.map(event => event.charIndex);
    const sorted = [...indices].sort((a, b) => a - b);
    assert.deepEqual(indices, sorted, "match indices should be monotonic");

    const skipped = events.filter(event => event.type === "skipped");
    const uniqueSkipIndices = new Set(skipped.map(event => event.charIndex));
    assert.equal(uniqueSkipIndices.size, skipped.length, "skip events should not repeat the same index");
});

test("pronoun detections are ignored until the subject is confirmed in the new message", () => {
    const profile = setupProfile({ detectPronoun: true, detectAction: true });
    const bufKey = "tester-pronoun";
    const msgState = createMessageState(profile);
    msgState.pendingSubject = "Kotori";
    msgState.pendingSubjectNormalized = msgState.pendingSubject.toLowerCase();
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    const text = "She moved quickly across the stage.";
    const result = simulateTesterStream(text, profile, bufKey);

    const switchEvents = result.events.filter(event => event.type === "switch");
    assert.equal(switchEvents.length, 0, "should not switch on an unconfirmed pronoun subject");
    assert.equal(msgState.lastSubject, null, "subject should remain unset until confirmed by a non-pronoun match");
});

test("first-token pronoun yields a detection when falling back to the pending subject", () => {
    const profile = setupProfile({ detectPronoun: true, detectAction: true });
    const bufKey = "tester-pronoun-leading";
    const msgState = createMessageState(profile);
    msgState.pendingSubject = "Kotori";
    msgState.pendingSubjectNormalized = msgState.pendingSubject.toLowerCase();
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    const text = "She moved swiftly to intercept the attack.";
    const result = simulateTesterStream(text, profile, bufKey);

    const pronounEvents = result.events.filter(event => event.matchKind === "pronoun");
    assert.ok(pronounEvents.length > 0, "expected a pronoun detection for the leading token");
    const pronounMatches = collectDetections(text, profile, state.compiledRegexes, {
        priorityWeights: { pronoun: profile.priorityPronounWeight },
        lastSubject: msgState.pendingSubject,
    }).filter(match => match.matchKind === "pronoun");
    assert.ok(pronounMatches.length > 0, "expected a pronoun match from the detector core");
    assert.equal(pronounMatches[0].matchIndex, 0, "pronoun detection should start at the first token");
    assert.equal(pronounMatches[0].tokenIndex, 0, "pronoun detection should begin with the first token index");
    const expectedEnd = pronounMatches[0].matchIndex + (pronounMatches[0].matchLength || 1) - 1;
    assert.equal(pronounEvents[0].charIndex, expectedEnd, "pronoun detection should report the ending index of the match span");
    const expectedTokenEnd = pronounMatches[0].tokenIndex + (pronounMatches[0].tokenLength || 1) - 1;
    const eventTokenEnd = pronounEvents[0].tokenIndex + ((pronounEvents[0].tokenLength || 1) - 1);
    assert.equal(eventTokenEnd, expectedTokenEnd, "pronoun detection should report the ending token span");
    assert.equal(msgState.pendingSubject, "Kotori", "pending subject should persist until a non-pronoun confirmation occurs");
});

test("pronoun repeats do not emit redundant tester events", () => {
    const profile = setupProfile({
        detectPronoun: true,
        detectAction: true,
        globalCooldownMs: 0,
        repeatSuppressMs: 0,
        enableOutfits: false,
    });
    const bufKey = "tester-pronoun-throttle";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    const text = "Kotori waves to the crowd. He moved toward the console. He moved again moments later.";
    const result = simulateTesterStream(text, profile, bufKey);

    const events = result.events.filter(event => event.type !== "veto");
    assert.equal(events.length, 1, "only the explicit name should yield a tester event");
    assert.notEqual(events[0].matchKind, "pronoun", "recorded tester event should come from the explicit cue");
});

test("simulateTesterStream records per-character tester outputs", () => {
    const profile = setupProfile();
    const bufKey = "tester-output";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    clearLiveTesterOutputs();

    const text = "Kotori smiles and waves. Shido nods.";
    const result = simulateTesterStream(text, profile, bufKey);

    assert.ok(result.events.length > 0, "expected tester events to be recorded");

    const snapshot = getLiveTesterOutputsSnapshot();
    const entries = snapshot.entries || [];
    const kotoriEntry = entries.find(entry => entry.normalized === "kotori");
    assert.ok(kotoriEntry, "expected Kotori to appear in tester outputs");
    assert.ok(kotoriEntry.summary.switches + kotoriEntry.summary.skips + kotoriEntry.summary.vetoes > 0,
        "expected Kotori tester summary to track events");
    assert.equal(snapshot.preprocessedText, state.lastPreprocessedText,
        "tester snapshot should expose the latest preprocessed buffer");
});

test("simulateTesterStream accepts a preprocessed text snapshot override", () => {
    const profile = setupProfile();
    const bufKey = "tester-preprocessed-override";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    clearLiveTesterOutputs();

    const text = "Kotori waves hello.";
    const overrideText = "[Kotori] waves hello.";
    simulateTesterStream(text, profile, bufKey, { preprocessedText: overrideText });

    const snapshot = getLiveTesterOutputsSnapshot();
    assert.equal(snapshot.preprocessedText, overrideText,
        "tester outputs should respect the provided preprocessed text snapshot");
    assert.equal(state.lastPreprocessedText, overrideText,
        "state should retain the override preprocessed text after the simulation");
});

test("simulateTesterStream syncs tester events into the shared decision log", () => {
    const profile = setupProfile();
    const bufKey = "tester-shared-log";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    state.recentDecisionEvents = [{ type: "switch", messageKey: "m1", name: "Origami" }];

    const text = "Kotori waves enthusiastically before Shido responds.";
    simulateTesterStream(text, profile, bufKey);

    const logEvents = Array.isArray(state.recentDecisionEvents) ? state.recentDecisionEvents : [];
    assert.ok(logEvents.length > 0, "expected tester events to populate the recent decision log");
    assert.ok(logEvents.every(event => typeof event.messageKey === "string" && event.messageKey.startsWith("tester:")),
        "tester events should be keyed to the tester namespace");

    const session = extensionSettingsStore[extensionName].session;
    assert.ok(Array.isArray(session.recentDecisionEvents), "session cache should mirror tester decision events");
    assert.equal(session.recentDecisionEvents.length, logEvents.length,
        "session log should match the in-memory tester log length");
    assert.ok(session.recentDecisionEvents.every(event => event.messageKey.startsWith("tester:")),
        "session tester log should carry the tester message key prefix");
});

test("simulateTesterStream surfaces a fuzzy idle warning when tolerance is enabled without detections", () => {
    const profile = setupProfile({
        detectGeneral: false,
        detectAttribution: false,
        detectAction: false,
        detectPronoun: false,
        fuzzyTolerance: "auto",
    });
    const bufKey = "tester-fuzzy-warning";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);

    const text = "Ambient narration without explicit character cues.";
    const result = simulateTesterStream(text, profile, bufKey);

    assert.equal(result.events.length, 0, "expected no detection events when all detectors are disabled");
    const warning = result.rosterWarnings.find(entry => entry?.type === "fuzzy-idle");
    assert.ok(warning, "fuzzy idle warning should be surfaced when tolerance is enabled but unused");
    assert.match(warning.message, /detect general name mentions/i, "warning should recommend enabling General Name detection");
    assert.match(warning.message, /detect attribution and detect action/i, "warning should mention attribution or action verbs for fuzzy context");
});

test("incremental analytics handles long streaming messages without full rescans", () => {
    const profile = setupProfile({ detectGeneral: true, maxBufferChars: 8192 });
    const bufKey = "tester-incremental";
    const msgState = createMessageState(profile);
    state.perMessageStates = new Map([[bufKey, msgState]]);
    state.perMessageBuffers = new Map([[bufKey, ""]]);
    state.messageMatches = new Map();
    state.messageStats = new Map();
    state.topSceneRanking = new Map();
    state.topSceneRankingUpdatedAt = new Map();

    const segments = [];
    for (let i = 0; i < 120; i += 1) {
        if (i % 2 === 0) {
            segments.push("Kotori relays orders to Shido while Kotori adjusts the controls. ");
        } else {
            segments.push("Shido answers Kotori with determination as Shido steadies the crew. ");
        }
    }
    const longMessage = segments.join("");
    const chunkSize = 64;
    const chunks = [];
    for (let i = 0; i < longMessage.length; i += chunkSize) {
        chunks.push(longMessage.slice(i, i + chunkSize));
    }

    let buffer = "";
    chunks.forEach((chunk) => {
        const previousLength = buffer.length;
        buffer += chunk;
        state.perMessageBuffers.set(bufKey, buffer);
        updateMessageAnalytics(bufKey, buffer, {
            rosterSet: msgState.sceneRoster,
            assumeNormalized: true,
            bufferOffset: msgState.bufferOffset,
            incremental: true,
            startIndex: previousLength,
            previousProcessedAbsolute: msgState.detectionContext.lastProcessedAbsolute,
            messageState: msgState,
        });
        msgState.processedLength = buffer.length;
    });

    const metrics = msgState.detectionContext.metrics;
    assert.ok(metrics.incrementalRuns >= chunks.length,
        "expected the incremental scanner to run for each streamed chunk");
    assert.equal(metrics.fullRuns, 0, "full rescans should be avoided during incremental streaming");
    assert.equal(metrics.incrementalChars, longMessage.length,
        "incremental scanner should process the entire message length");

    const stats = state.messageStats.get(bufKey);
    assert.ok(stats instanceof Map && stats.size > 0, "expected analytics stats for the streamed message");

    const detectionOptions = {
        priorityWeights: {
            speaker: profile.prioritySpeakerWeight,
            attribution: profile.priorityAttributionWeight,
            action: profile.priorityActionWeight,
            pronoun: profile.priorityPronounWeight,
            vocative: profile.priorityVocativeWeight,
            possessive: profile.priorityPossessiveWeight,
            name: profile.priorityNameWeight,
        },
        scanDialogueActions: Boolean(profile.scanDialogueActions),
    };
    const offlineMatches = collectDetections(longMessage, profile, state.compiledRegexes, detectionOptions);
    const expectedStats = new Map();
    offlineMatches.forEach((match) => {
        const normalized = String(match?.name ?? "").trim();
        if (!normalized) {
            return;
        }
        expectedStats.set(normalized, (expectedStats.get(normalized) || 0) + 1);
    });
    assert.deepEqual(Array.from(stats.entries()), Array.from(expectedStats.entries()),
        "incremental stats should match a full detection pass");

    const ranking = state.topSceneRanking.get(bufKey) || [];
    assert.ok(ranking.length > 0, "expected a populated ranking for the streamed message");
    assert.equal(ranking[0].name, "Kotori", "highest frequency character should top the ranking");
});
