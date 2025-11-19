import test from "node:test";
import assert from "node:assert/strict";
import { mergeDetectionsForReport, summarizeDetections } from "../src/report-utils.js";

test("mergeDetectionsForReport omits standalone pronoun matches", () => {
    const report = {
        matches: [
            { name: "Shido", matchKind: "pronoun", matchIndex: 12, priority: 2 },
            { name: "Shido", matchKind: "action", matchIndex: 4, priority: 3 },
        ],
        events: [],
        scoreDetails: [],
    };
    const merged = mergeDetectionsForReport(report);
    assert.equal(merged.some(entry => entry.matchKind === "pronoun"), false);
});

test("pronoun events remain visible after merging", () => {
    const report = {
        matches: [],
        events: [
            { name: "Shido", matchKind: "pronoun", charIndex: 42 },
        ],
        scoreDetails: [],
    };
    const merged = mergeDetectionsForReport(report);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].matchKind, "pronoun");
});

test("summarizeDetections reflects pronoun counts only from events", () => {
    const report = {
        matches: [
            { name: "Shido", matchKind: "pronoun", matchIndex: 8, priority: 2 },
        ],
        events: [
            { name: "Shido", matchKind: "pronoun", charIndex: 20 },
        ],
        scoreDetails: [],
    };
    const merged = mergeDetectionsForReport(report);
    const summary = summarizeDetections(merged);
    assert.equal(summary.length, 1);
    assert.equal(summary[0].name, "Shido");
    assert.equal(summary[0].total, 1);
    assert.deepEqual(summary[0].kinds, { pronoun: 1 });
});
