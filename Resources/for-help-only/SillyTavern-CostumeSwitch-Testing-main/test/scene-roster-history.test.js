import test from "node:test";
import assert from "node:assert/strict";

import { deriveSceneRosterState } from "../src/core/state.js";

test("mergeRosterData infers turns remaining from history counts within the TTL window", () => {
    const now = Date.now();
    const sceneSnapshot = {
        key: "m7",
        roster: [
            {
                name: "Kotori",
                normalized: "kotori",
                joinedAt: now - 1000,
                lastSeenAt: now,
                active: true,
            },
        ],
        lastEvent: null,
        updatedAt: now,
        displayNames: new Map([["kotori", "Kotori"]]),
    };
    const messageState = {
        sceneRoster: new Set(["kotori"]),
        rosterTurns: new Map([["kotori", 3]]),
        defaultRosterTTL: 5,
        removedRoster: new Set(),
    };
    const derived = deriveSceneRosterState({
        messageState,
        sceneSnapshot,
        testerSnapshot: null,
        now,
    });
    const entries = derived.roster;
    const kotori = entries.find((entry) => entry.normalized === "kotori");
    assert.ok(kotori, "expected Kotori to appear in merged roster");
    assert.equal(kotori.turnsRemaining, 3, "turns remaining should use per-message state values");
});

test("mergeRosterData prefers per-member turn values from history when available", () => {
    const now = Date.now();
    const sceneSnapshot = {
        key: "m2",
        roster: [
            {
                name: "Kotori",
                normalized: "kotori",
                joinedAt: now - 2000,
                lastSeenAt: now - 1000,
                active: true,
            },
        ],
        lastEvent: null,
        updatedAt: now,
        displayNames: new Map([["kotori", "Kotori"]]),
    };
    const messageState = {
        sceneRoster: new Set(["kotori"]),
        rosterTurns: new Map([["kotori", 4]]),
        defaultRosterTTL: 5,
        removedRoster: new Set(),
    };
    const derived = deriveSceneRosterState({
        messageState,
        sceneSnapshot,
        testerSnapshot: null,
        now,
    });
    const entries = derived.roster;
    const kotori = entries.find((entry) => entry.normalized === "kotori");
    assert.ok(kotori, "expected Kotori to appear in merged roster");
    assert.equal(kotori.turnsRemaining, 4, "per-member turn values should override default TTL fallback");
});
