import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

await register(new URL("./module-mock-loader.js", import.meta.url));

import {
    DEFAULT_ACTION_VERBS_PRESENT,
    DEFAULT_ACTION_VERBS_THIRD_PERSON,
    DEFAULT_ACTION_VERBS_PAST,
    DEFAULT_ACTION_VERBS_PAST_PARTICIPLE,
    DEFAULT_ACTION_VERBS_PRESENT_PARTICIPLE,
    DEFAULT_ATTRIBUTION_VERBS_PRESENT,
    DEFAULT_ATTRIBUTION_VERBS_THIRD_PERSON,
    DEFAULT_ATTRIBUTION_VERBS_PAST,
    DEFAULT_ATTRIBUTION_VERBS_PAST_PARTICIPLE,
    DEFAULT_ATTRIBUTION_VERBS_PRESENT_PARTICIPLE,
    EXTENDED_ACTION_VERBS_PRESENT,
    EXTENDED_ACTION_VERBS_THIRD_PERSON,
    EXTENDED_ACTION_VERBS_PAST,
    EXTENDED_ACTION_VERBS_PAST_PARTICIPLE,
    EXTENDED_ACTION_VERBS_PRESENT_PARTICIPLE,
    EXTENDED_ATTRIBUTION_VERBS_PRESENT,
    EXTENDED_ATTRIBUTION_VERBS_THIRD_PERSON,
    EXTENDED_ATTRIBUTION_VERBS_PAST,
    EXTENDED_ATTRIBUTION_VERBS_PAST_PARTICIPLE,
    EXTENDED_ATTRIBUTION_VERBS_PRESENT_PARTICIPLE,
    VERB_CATALOG,
} from "../verbs.js";
import { getVerbEntries } from "../src/data/verbCatalog.js";

const { getVerbInflections } = await import("../index.js");

const CURATED_PHRASAL_VERBS = [
    {
        base: "perk up",
        forms: {
            thirdPerson: "perks up",
            past: "perked up",
            pastParticiple: "perked up",
            presentParticiple: "perking up",
        },
        availability: [
            { category: "action", edition: "default" },
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "lash out",
        forms: {
            thirdPerson: "lashes out",
            past: "lashed out",
            pastParticiple: "lashed out",
            presentParticiple: "lashing out",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "drift off",
        forms: {
            thirdPerson: "drifts off",
            past: "drifted off",
            pastParticiple: "drifted off",
            presentParticiple: "drifting off",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "double down",
        forms: {
            thirdPerson: "doubles down",
            past: "doubled down",
            pastParticiple: "doubled down",
            presentParticiple: "doubling down",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "trail off",
        forms: {
            thirdPerson: "trails off",
            past: "trailed off",
            pastParticiple: "trailed off",
            presentParticiple: "trailing off",
        },
        availability: [
            { category: "attribution", edition: "extended" },
        ],
    },
    {
        base: "point out",
        forms: {
            thirdPerson: "points out",
            past: "pointed out",
            pastParticiple: "pointed out",
            presentParticiple: "pointing out",
        },
        availability: [
            { category: "attribution", edition: "extended" },
        ],
    },
    {
        base: "fall apart",
        forms: {
            thirdPerson: "falls apart",
            past: "fell apart",
            pastParticiple: "fallen apart",
            presentParticiple: "falling apart",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "lie down",
        forms: {
            thirdPerson: "lies down",
            past: "lay down",
            pastParticiple: "lain down",
            presentParticiple: "lying down",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
];

const CURATED_IRREGULAR_VERBS = [
    {
        base: "arise",
        forms: {
            thirdPerson: "arises",
            past: "arose",
            pastParticiple: "arisen",
            presentParticiple: "arising",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "befall",
        forms: {
            thirdPerson: "befalls",
            past: "befell",
            pastParticiple: "befallen",
            presentParticiple: "befalling",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "overcome",
        forms: {
            thirdPerson: "overcomes",
            past: "overcame",
            pastParticiple: "overcome",
            presentParticiple: "overcoming",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
    {
        base: "withstand",
        forms: {
            thirdPerson: "withstands",
            past: "withstood",
            pastParticiple: "withstood",
            presentParticiple: "withstanding",
        },
        availability: [
            { category: "action", edition: "extended" },
        ],
    },
];

test("third-person slices expose legacy and extended verbs", () => {
    assert.ok(DEFAULT_ATTRIBUTION_VERBS_THIRD_PERSON.includes("acknowledges"));
    assert.ok(EXTENDED_ATTRIBUTION_VERBS_THIRD_PERSON.includes("says"));
    assert.ok(DEFAULT_ACTION_VERBS_THIRD_PERSON.includes("runs"));
    assert.ok(EXTENDED_ACTION_VERBS_THIRD_PERSON.includes("accelerates"));
});

test("getVerbInflections exposes configurable tense slices", () => {
    const attribution = getVerbInflections("attribution", "default");
    assert.ok(attribution.thirdPerson.includes("acknowledges"));
    const extendedAction = getVerbInflections("action", "extended");
    assert.ok(extendedAction.base.includes("accelerate"));
    assert.ok(extendedAction.thirdPerson.includes("accelerates"));
});

test("tense-specific verb lists align with catalog forms", () => {
    const validations = [
        { name: "DEFAULT_ATTRIBUTION_VERBS_PRESENT", list: DEFAULT_ATTRIBUTION_VERBS_PRESENT, category: "attribution", edition: "default", form: "base" },
        { name: "DEFAULT_ATTRIBUTION_VERBS_THIRD_PERSON", list: DEFAULT_ATTRIBUTION_VERBS_THIRD_PERSON, category: "attribution", edition: "default", form: "thirdPerson" },
        { name: "DEFAULT_ATTRIBUTION_VERBS_PAST", list: DEFAULT_ATTRIBUTION_VERBS_PAST, category: "attribution", edition: "default", form: "past" },
        { name: "DEFAULT_ATTRIBUTION_VERBS_PAST_PARTICIPLE", list: DEFAULT_ATTRIBUTION_VERBS_PAST_PARTICIPLE, category: "attribution", edition: "default", form: "pastParticiple" },
        { name: "DEFAULT_ATTRIBUTION_VERBS_PRESENT_PARTICIPLE", list: DEFAULT_ATTRIBUTION_VERBS_PRESENT_PARTICIPLE, category: "attribution", edition: "default", form: "presentParticiple" },
        { name: "EXTENDED_ATTRIBUTION_VERBS_PRESENT", list: EXTENDED_ATTRIBUTION_VERBS_PRESENT, category: "attribution", edition: "extended", form: "base" },
        { name: "EXTENDED_ATTRIBUTION_VERBS_THIRD_PERSON", list: EXTENDED_ATTRIBUTION_VERBS_THIRD_PERSON, category: "attribution", edition: "extended", form: "thirdPerson" },
        { name: "EXTENDED_ATTRIBUTION_VERBS_PAST", list: EXTENDED_ATTRIBUTION_VERBS_PAST, category: "attribution", edition: "extended", form: "past" },
        { name: "EXTENDED_ATTRIBUTION_VERBS_PAST_PARTICIPLE", list: EXTENDED_ATTRIBUTION_VERBS_PAST_PARTICIPLE, category: "attribution", edition: "extended", form: "pastParticiple" },
        { name: "EXTENDED_ATTRIBUTION_VERBS_PRESENT_PARTICIPLE", list: EXTENDED_ATTRIBUTION_VERBS_PRESENT_PARTICIPLE, category: "attribution", edition: "extended", form: "presentParticiple" },
        { name: "DEFAULT_ACTION_VERBS_PRESENT", list: DEFAULT_ACTION_VERBS_PRESENT, category: "action", edition: "default", form: "base" },
        { name: "DEFAULT_ACTION_VERBS_THIRD_PERSON", list: DEFAULT_ACTION_VERBS_THIRD_PERSON, category: "action", edition: "default", form: "thirdPerson" },
        { name: "DEFAULT_ACTION_VERBS_PAST", list: DEFAULT_ACTION_VERBS_PAST, category: "action", edition: "default", form: "past" },
        { name: "DEFAULT_ACTION_VERBS_PAST_PARTICIPLE", list: DEFAULT_ACTION_VERBS_PAST_PARTICIPLE, category: "action", edition: "default", form: "pastParticiple" },
        { name: "DEFAULT_ACTION_VERBS_PRESENT_PARTICIPLE", list: DEFAULT_ACTION_VERBS_PRESENT_PARTICIPLE, category: "action", edition: "default", form: "presentParticiple" },
        { name: "EXTENDED_ACTION_VERBS_PRESENT", list: EXTENDED_ACTION_VERBS_PRESENT, category: "action", edition: "extended", form: "base" },
        { name: "EXTENDED_ACTION_VERBS_THIRD_PERSON", list: EXTENDED_ACTION_VERBS_THIRD_PERSON, category: "action", edition: "extended", form: "thirdPerson" },
        { name: "EXTENDED_ACTION_VERBS_PAST", list: EXTENDED_ACTION_VERBS_PAST, category: "action", edition: "extended", form: "past" },
        { name: "EXTENDED_ACTION_VERBS_PAST_PARTICIPLE", list: EXTENDED_ACTION_VERBS_PAST_PARTICIPLE, category: "action", edition: "extended", form: "pastParticiple" },
        { name: "EXTENDED_ACTION_VERBS_PRESENT_PARTICIPLE", list: EXTENDED_ACTION_VERBS_PRESENT_PARTICIPLE, category: "action", edition: "extended", form: "presentParticiple" },
    ];

    for (const { name, list, category, edition, form } of validations) {
        const expected = new Set(
            VERB_CATALOG
                .filter(entry => Boolean(entry?.categories?.[category]?.[edition]))
                .map(entry => entry?.forms?.[form])
                .filter(Boolean),
        );

        const uniqueList = new Set(list);
        assert.strictEqual(list.length, uniqueList.size, `${name} should not contain duplicate verbs`);

        const sortedList = Array.from(uniqueList).sort();
        const sortedExpected = Array.from(expected).sort();
        assert.deepStrictEqual(
            sortedList,
            sortedExpected,
            `${name} should only include ${form} forms for ${edition} ${category} verbs`,
        );
    }
});

function validateCuratedVerbs(expectations, label) {
    const catalogMap = new Map(VERB_CATALOG.map(entry => [entry.base, entry]));
    for (const expectation of expectations) {
        const { base, forms, availability } = expectation;
        const entry = catalogMap.get(base);
        assert.ok(entry, `${label} verb ${base} should exist in the catalog`);
        assert.strictEqual(entry.base, base, `${label} verb ${base} should preserve its base lemma`);
        assert.deepStrictEqual(
            {
                thirdPerson: entry.forms.thirdPerson,
                past: entry.forms.past,
                pastParticiple: entry.forms.pastParticiple,
                presentParticiple: entry.forms.presentParticiple,
            },
            forms,
            `${label} verb ${base} should expose complete inflections`,
        );

        for (const { category, edition } of availability) {
            const entries = getVerbEntries({ category, edition });
            assert.ok(
                entries.some(catalogEntry => catalogEntry.base === base),
                `${label} verb ${base} should be discoverable for ${edition} ${category}`,
            );

            const inflections = getVerbInflections(category, edition);
            assert.ok(
                inflections.base.includes(base),
                `${label} verb ${base} should appear in base slice for ${edition} ${category}`,
            );
            assert.ok(
                inflections.thirdPerson.includes(forms.thirdPerson),
                `${label} verb ${base} should appear in third-person slice for ${edition} ${category}`,
            );
            assert.ok(
                inflections.past.includes(forms.past),
                `${label} verb ${base} should appear in past slice for ${edition} ${category}`,
            );
            assert.ok(
                inflections.pastParticiple.includes(forms.pastParticiple),
                `${label} verb ${base} should appear in past participle slice for ${edition} ${category}`,
            );
            assert.ok(
                inflections.presentParticiple.includes(forms.presentParticiple),
                `${label} verb ${base} should appear in present participle slice for ${edition} ${category}`,
            );
        }
    }
}

test("curated phrasal verbs expose complete forms and lookups", () => {
    validateCuratedVerbs(CURATED_PHRASAL_VERBS, "Phrasal");
});

test("curated irregular verbs expose complete forms and lookups", () => {
    validateCuratedVerbs(CURATED_IRREGULAR_VERBS, "Irregular");
});
