import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const extensionSettingsStore = {};
globalThis.__extensionSettingsStore = extensionSettingsStore;

const { state, extensionName, __testables } = await import("../index.js");

const { handleGenerationStart, resolveMessageRoleFromArgs } = __testables;

extensionSettingsStore[extensionName] = {
    enabled: true,
    profiles: { Default: {} },
    activeProfile: "Default",
    scorePresets: {},
    activeScorePreset: "",
    focusLock: { character: null },
};

test("handleGenerationStart ignores nested user payloads", () => {
    const previousKey = state.currentGenerationKey;
    const previousContext = globalThis.__mockContext;

    state.currentGenerationKey = "m42";
    globalThis.__mockContext = {
        chat: [
            {
                mesId: 101,
                message_key: "m101",
                is_user: true,
            },
        ],
    };

    try {
        handleGenerationStart({ detail: { message: { mesId: 101, message_key: "m101", is_user: true } } });
        assert.equal(state.currentGenerationKey, null);
    } finally {
        state.currentGenerationKey = previousKey;
        if (typeof previousContext === "undefined") {
            delete globalThis.__mockContext;
        } else {
            globalThis.__mockContext = previousContext;
        }
    }
});

test("handleGenerationStart consults chat history for user-authored messages", () => {
    const previousKey = state.currentGenerationKey;
    const previousContext = globalThis.__mockContext;

    state.currentGenerationKey = "m77";
    globalThis.__mockContext = {
        chat: [
            {
                mesId: 202,
                message_key: "m202",
                is_user: true,
            },
        ],
    };

    try {
        handleGenerationStart({ detail: { message: { mesId: 202 } } });
        assert.equal(state.currentGenerationKey, null);
    } finally {
        state.currentGenerationKey = previousKey;
        if (typeof previousContext === "undefined") {
            delete globalThis.__mockContext;
        } else {
            globalThis.__mockContext = previousContext;
        }
    }
});

test("resolveMessageRoleFromArgs inspects payload containers", () => {
    const role = resolveMessageRoleFromArgs([
        { payload: { message: { is_user: true } } },
    ]);
    assert.equal(role, "user");
});

test("resolveMessageRoleFromArgs inspects payload message collections", () => {
    const role = resolveMessageRoleFromArgs([
        { payload: { messages: [{ role: "system" }] } },
    ]);
    assert.equal(role, "system");
});

test("resolveMessageRoleFromArgs inspects event and data wrappers", () => {
    const role = resolveMessageRoleFromArgs([
        {
            event: {
                data: {
                    messages: [
                        { is_assistant: true },
                    ],
                },
            },
        },
    ]);
    assert.equal(role, "assistant");
});
