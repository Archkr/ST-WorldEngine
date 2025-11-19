import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

const { rankSceneCharacters } = await import("../index.js");

test("rankSceneCharacters prefers canonical names in summaries", () => {
    const matches = [
        { name: "Yoshinon", rawName: "Now", matchKind: "fuzzy-fallback", matchIndex: 10, priority: 1 },
        { name: "Yoshinon", rawName: "Yoshinon", matchKind: "action", matchIndex: 200, priority: 3 },
    ];
    const ranking = rankSceneCharacters(matches, {
        profile: { distancePenaltyWeight: 0, rosterBonus: 0 },
    });
    assert.equal(ranking[0].name, "Yoshinon");
    assert.equal(ranking[0].rawName, "Now");
});
