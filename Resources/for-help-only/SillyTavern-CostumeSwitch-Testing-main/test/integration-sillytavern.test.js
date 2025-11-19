import test from "node:test";
import assert from "node:assert/strict";

import { __testing } from "../src/systems/integration/sillytavern.js";

const { resolveEventIdentifiers } = __testing;

test("resolveEventIdentifiers matches regex-based candidates", () => {
    const eventTypes = {
        GENERATION_STOPPED: "generation_stopped",
        STREAM_TOKEN_EVENT: "stream_token_event",
    };
    const result = resolveEventIdentifiers(eventTypes, [
        { match: /(GENERATION|STREAM).*STOP/i },
    ]);
    assert.deepEqual(result, ["generation_stopped"], "should map matching keys to resolved event names");
});

test("resolveEventIdentifiers falls back to provided names when no matches", () => {
    const eventTypes = {};
    const result = resolveEventIdentifiers(eventTypes, [
        { match: /(GENERATION|STREAM).*STOP/i, fallback: ["GENERATION_STOPPED", "STREAM_STOPPED"] },
    ]);
    assert.deepEqual(result, ["GENERATION_STOPPED", "STREAM_STOPPED"], "should return fallback names when no mapping exists");
});

test("resolveEventIdentifiers still accepts explicit string candidates", () => {
    const eventTypes = {
        STREAM_TOKEN: "stream_token",
    };
    const result = resolveEventIdentifiers(eventTypes, ["STREAM_TOKEN", "GENERATION_TOKEN"]);
    assert.deepEqual(result.sort(), ["GENERATION_TOKEN", "stream_token"].sort(), "should include mapped and literal names");
});

test("resolveEventIdentifiers traverses nested objects", () => {
    const eventTypes = {
        generation: {
            stream: {
                started: "generation_stream_started",
            },
        },
    };
    const result = resolveEventIdentifiers(eventTypes, [
        { match: /(GENERATION|STREAM).*START/i },
    ]);
    assert.deepEqual(result, ["generation_stream_started"], "should detect events within nested maps");
});

test("resolveEventIdentifiers resolves nested keys by name", () => {
    const eventTypes = {
        history: {
            message: {
                deleted: "message_deleted",
            },
        },
    };
    const result = resolveEventIdentifiers(eventTypes, ["deleted", "history.message.deleted"]);
    assert.deepEqual(result.sort(), ["history.message.deleted", "message_deleted"].sort(), "should match nested keys by name");
});

test("resolveEventIdentifiers returns symbol values when available", () => {
    const streamStarted = Symbol("generation_stream_started");
    const eventTypes = {
        generation: {
            stream: {
                started: streamStarted,
            },
        },
    };
    const [result] = resolveEventIdentifiers(eventTypes, [
        { match: /(GENERATION|STREAM).*START/i },
    ]);
    assert.equal(result, streamStarted, "should preserve symbol identifiers for registration");
});

test("resolveEventIdentifiers reads non-enumerable event descriptors", () => {
    const eventTypes = {};
    Object.defineProperty(eventTypes, "GENERATION_STARTED", {
        value: "generation_started_hidden",
        enumerable: false,
    });
    const result = resolveEventIdentifiers(eventTypes, ["GENERATION_STARTED"]);
    assert.deepEqual(result, ["generation_started_hidden"], "should detect hidden descriptor values");
});

test("resolveEventIdentifiers inspects symbol keyed events", () => {
    const symbolKey = Symbol("GENERATION_STARTED");
    const eventTypes = {};
    Object.defineProperty(eventTypes, symbolKey, {
        value: "generation_started_symbol",
        enumerable: false,
    });
    const result = resolveEventIdentifiers(eventTypes, [
        { match: /(GENERATION|STREAM).*START/i },
    ]);
    assert.deepEqual(result, ["generation_started_symbol"], "should match symbol keyed entries by description");
});
