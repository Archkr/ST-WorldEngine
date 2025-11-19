import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const extensionSettingsStore = globalThis.__extensionSettingsStore || (globalThis.__extensionSettingsStore = {});

const { restoreSceneOutcomeForMessage, state, extensionName, __testables } = await import("../index.js");
const {
    applySceneRosterUpdate,
    resetSceneState,
    clearLiveTesterOutputs,
    listRosterMembers,
    getCurrentSceneSnapshot,
    getRosterMembershipSnapshot,
} = await import("../src/core/state.js");

const baseSettings = {
    enabled: true,
    profiles: {},
    activeProfile: "Test",
    scorePresets: {},
    activeScorePreset: "",
    focusLock: { character: null },
};

test("restoreSceneOutcomeForMessage repopulates recent decision events from stored outcomes", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.messageStats = new Map();
    state.recentDecisionEvents = [{ type: "switch", messageKey: "tester:old", name: "Kotori" }];

    const storedEvents = [
        { type: "switch", name: "Kotori", normalized: "kotori", timestamp: 1234, messageKey: "m42" },
        { type: "skipped", name: "Shido", normalized: "shido", timestamp: 1250, messageKey: "m42", reason: "cooldown" },
    ];

    const message = {
        mesId: 42,
        is_user: false,
        mes: "Kotori waves. Shido hesitates.",
        swipe_id: 0,
        extra: {
            cs_scene_outcomes: {
                0: {
                    version: 1,
                    messageKey: "m42",
                    messageId: 42,
                    roster: ["kotori"],
                    displayNames: [["kotori", "Kotori"]],
                    events: storedEvents,
                    stats: [],
                    buffer: "Kotori waves. Shido hesitates.",
                    text: "Kotori waves. Shido hesitates.",
                    updatedAt: 1700,
                    lastEvent: storedEvents[1],
                },
            },
        },
    };

    const restored = restoreSceneOutcomeForMessage(message);
    assert.equal(restored, true, "stored outcomes should be restored for assistant messages");

    assert.equal(state.recentDecisionEvents.length, storedEvents.length,
        "restored log should match the stored event count");
    assert.ok(state.recentDecisionEvents.every(event => event.messageKey === "m42"),
        "restored events should be keyed to the original message");

    const session = extensionSettingsStore[extensionName].session;
    assert.ok(Array.isArray(session.recentDecisionEvents),
        "session cache should receive restored decision events");
    assert.equal(session.recentDecisionEvents.length, storedEvents.length,
        "session decision log should mirror the restored events");
    assert.ok(session.recentDecisionEvents.every(event => event.messageKey === "m42"),
        "session log events should retain the original message key");

    const scene = getCurrentSceneSnapshot();
    assert.equal(scene.updatedAt, 1700, "restored scene should reuse stored timestamps");

    const rosterSnapshot = getRosterMembershipSnapshot();
    assert.equal(rosterSnapshot.updatedAt, 1700, "roster snapshot should adopt stored timestamps");
});

test("restoreSceneOutcomeForMessage preserves active roster when stored roster empty", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.messageStats = new Map();

    resetSceneState();
    clearLiveTesterOutputs();

    const seedTimestamp = Date.now();

    applySceneRosterUpdate({
        key: "m1",
        messageId: 1,
        roster: [
            { name: "Kotori", normalized: "kotori", joinedAt: seedTimestamp - 1000, lastSeenAt: seedTimestamp },
            { name: "Shido", normalized: "shido", joinedAt: seedTimestamp - 2000, lastSeenAt: seedTimestamp },
        ],
        updatedAt: seedTimestamp,
    });

    const initialMembers = listRosterMembers();
    assert.equal(initialMembers.every(entry => entry.active), true,
        "seeded roster members should start active");

    const message = {
        mesId: 99,
        is_user: false,
        mes: "Kotori smiles.",
        swipe_id: 0,
        extra: {
            cs_scene_outcomes: {
                0: {
                    version: 1,
                    messageKey: "m99",
                    messageId: 99,
                    roster: [],
                    displayNames: [],
                    events: [],
                    stats: [],
                    buffer: "Kotori smiles.",
                    text: "Kotori smiles.",
                    updatedAt: seedTimestamp + 500,
                    lastEvent: null,
                },
            },
        },
    };

    const restored = restoreSceneOutcomeForMessage(message);
    assert.equal(restored, true, "stored outcome should restore even with an empty roster");

    const refreshedMembers = listRosterMembers();
    const kotori = refreshedMembers.find(entry => entry.normalized === "kotori");
    const shido = refreshedMembers.find(entry => entry.normalized === "shido");

    assert.equal(kotori?.active, true, "refresh should not deactivate existing roster members");
    assert.equal(shido?.active, true, "refresh should not deactivate secondary roster members");
});

test("restoreSceneOutcomeForMessage retains existing timestamp when stored outcome omits it", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.messageStats = new Map();

    resetSceneState();
    clearLiveTesterOutputs();

    const seedTimestamp = 7654;

    applySceneRosterUpdate({
        key: "m1",
        messageId: 1,
        roster: [
            { name: "Kotori", normalized: "kotori", joinedAt: seedTimestamp - 1000, lastSeenAt: seedTimestamp },
        ],
        updatedAt: seedTimestamp,
    });

    const message = {
        mesId: 43,
        is_user: false,
        mes: "Kotori nods.",
        swipe_id: 0,
        extra: {
            cs_scene_outcomes: {
                0: {
                    version: 1,
                    messageKey: "m43",
                    messageId: 43,
                    roster: ["kotori"],
                    displayNames: [["kotori", "Kotori"]],
                    events: [],
                    stats: [],
                    buffer: "Kotori nods.",
                    text: "Kotori nods.",
                    lastEvent: null,
                },
            },
        },
    };

    const restored = restoreSceneOutcomeForMessage(message);
    assert.equal(restored, true, "stored outcome without timestamp should still restore");

    const scene = getCurrentSceneSnapshot();
    assert.equal(scene.updatedAt, seedTimestamp, "scene snapshot should reuse prior timestamp");

    const rosterSnapshot = getRosterMembershipSnapshot();
    assert.equal(rosterSnapshot.updatedAt, seedTimestamp, "roster snapshot should preserve prior timestamp");
});

test("findAssistantMessageBeforeIndex skips system and narrator entries", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    globalThis.__mockContext = {
        chat: [
            { mesId: 1, is_user: false, mes: "Kotori reports in.", swipe_id: 0 },
            { mesId: 2, is_user: false, is_system: true, mes: "System note." },
            { mesId: 3, is_user: false, mes: "Narration arrives.", extra: { type: "narrator" } },
        ],
    };

    const assistant = __testables.findAssistantMessageBeforeIndex(2);
    assert.equal(assistant?.mesId, 1, "should resolve the latest assistant message before system/narrator entries");

    const narratorLookup = __testables.findChatMessageByKey("m3");
    assert.equal(narratorLookup, null, "narrator messages should be ignored when searching by key");

    const assistantLookup = __testables.findChatMessageByKey("m1");
    assert.equal(assistantLookup?.mesId, 1, "assistant messages should still resolve by key");

    globalThis.__mockContext = null;
});

test("resolveHistoryTargetMessage falls back before system and narrator messages", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    const assistantMessage = { mesId: 10, is_user: false, mes: "Kotori salutes.", swipe_id: 0 };
    globalThis.__mockContext = {
        chat: [
            assistantMessage,
            { mesId: 11, is_user: false, mes: "Narrator speaks.", extra: { type: "narrator" } },
            { mesId: 12, is_user: false, is_system: true, mes: "System announcement." },
        ],
    };

    const resolvedFromNarrator = __testables.resolveHistoryTargetMessage([{ index: 1 }]);
    assert.equal(resolvedFromNarrator?.mesId, assistantMessage.mesId,
        "narrator targets should resolve to the prior assistant message");

    const resolvedFromSystem = __testables.resolveHistoryTargetMessage([{ index: 2 }]);
    assert.equal(resolvedFromSystem?.mesId, assistantMessage.mesId,
        "system targets should resolve to the prior assistant message");

    globalThis.__mockContext = null;
});

test("restoreLatestSceneOutcome restores the last assistant when newer posts are narrator/system", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.messageStats = new Map();

    resetSceneState();
    clearLiveTesterOutputs();

    const restoredOutcome = {
        version: 1,
        messageKey: "m25",
        messageId: 25,
        roster: ["kotori"],
        displayNames: [["kotori", "Kotori"]],
        events: [],
        stats: [],
        buffer: "Kotori waves.",
        text: "Kotori waves.",
        updatedAt: 4242,
        lastEvent: null,
    };

    const assistantMessage = {
        mesId: 25,
        is_user: false,
        mes: "Kotori waves.",
        swipe_id: 0,
        extra: { cs_scene_outcomes: { 0: restoredOutcome } },
    };

    globalThis.__mockContext = {
        chat: [
            assistantMessage,
            { mesId: 26, is_user: false, mes: "Narrator elaborates.", extra: { type: "narrator" } },
            { mesId: 27, is_user: false, is_system: true, mes: "System declaration." },
        ],
    };

    const restored = __testables.restoreLatestSceneOutcome({ immediateRender: false });
    assert.equal(restored, true, "restoring should succeed when an assistant message exists in history");

    const sceneSnapshot = getCurrentSceneSnapshot();
    assert.equal(sceneSnapshot?.key, "m25", "scene snapshot should reference the assistant message");

    const rosterSnapshot = getRosterMembershipSnapshot();
    assert.equal(rosterSnapshot.members.some((entry) => entry.normalized === "kotori"), true,
        "restored roster should preserve assistant detections");

    assert.equal(state.perMessageBuffers instanceof Map && state.perMessageBuffers.has("m25"), true,
        "assistant buffers should be retained after restore");

    globalThis.__mockContext = null;
});

test("handleHistoryChange restores prior assistant outcomes when narrator/system are most recent", () => {
    extensionSettingsStore[extensionName] = {
        ...baseSettings,
        session: {},
    };

    state.perMessageBuffers = new Map();
    state.perMessageStates = new Map();
    state.messageStats = new Map();

    resetSceneState();
    clearLiveTesterOutputs();

    const restoredOutcome = {
        version: 1,
        messageKey: "m50",
        messageId: 50,
        roster: ["kotori"],
        displayNames: [["kotori", "Kotori"]],
        events: [],
        stats: [],
        buffer: "Kotori smiles brightly.",
        text: "Kotori smiles brightly.",
        updatedAt: 1111,
        lastEvent: null,
    };

    const assistantMessage = {
        mesId: 50,
        is_user: false,
        mes: "Kotori smiles brightly.",
        swipe_id: 0,
        extra: { cs_scene_outcomes: { 0: restoredOutcome } },
    };

    globalThis.__mockContext = {
        chat: [
            assistantMessage,
            { mesId: 51, is_user: false, mes: "Narrator elaborates further.", extra: { type: "narrator" } },
            { mesId: 52, is_user: false, is_system: true, mes: "System reminder." },
        ],
    };

    __testables.handleHistoryChange([{ index: 2 }]);

    const sceneSnapshot = getCurrentSceneSnapshot();
    assert.equal(sceneSnapshot?.key, "m50", "history change should restore the prior assistant outcome");
    assert.equal(sceneSnapshot?.updatedAt, restoredOutcome.updatedAt,
        "restored scene snapshot should reuse stored timestamps");

    const rosterSnapshot = getRosterMembershipSnapshot();
    assert.equal(rosterSnapshot.members.some((entry) => entry.normalized === "kotori"), true,
        "roster membership should reflect restored assistant state");

    globalThis.__mockContext = null;
});
