import test from 'node:test';
import assert from 'node:assert/strict';

import { loadProfiles, normalizeProfile, mappingHasIdentity, prepareMappingsForSave } from '../profile-utils.js';

const PROFILE_DEFAULTS = {
    mappings: [],
    enableOutfits: true,
};

test('loadProfiles wraps legacy mapping entries with default folder', () => {
    const legacyProfiles = {
        Legacy: {
            mappings: [
                { name: 'Alice', folder: 'alice-main' },
            ],
        },
    };

    const loaded = loadProfiles(legacyProfiles, PROFILE_DEFAULTS);

    assert.ok(loaded.Legacy, 'profile should exist after load');
    assert.equal(loaded.Legacy.enableOutfits, true, 'legacy profile should default outfit automation to enabled');
    assert.equal(loaded.Legacy.mappings.length, 1, 'legacy mapping should be preserved');

    const mapping = loaded.Legacy.mappings[0];
    assert.equal(mapping.name, 'Alice');
    assert.equal(mapping.defaultFolder, 'alice-main');
    assert.equal(mapping.folder, 'alice-main', 'folder alias should match defaultFolder for compatibility');
    assert.deepEqual(mapping.outfits, [], 'legacy mappings should expose an empty outfits array');

    const serialized = JSON.parse(JSON.stringify(loaded.Legacy));
    const rehydrated = normalizeProfile(serialized, PROFILE_DEFAULTS);
    assert.deepEqual(rehydrated.mappings, loaded.Legacy.mappings, 'legacy mapping should round-trip through serialization');
    assert.equal(rehydrated.enableOutfits, true, 'legacy profile should remain outfit-enabled after normalization');
});

test('loadProfiles preserves enableOutfits flag and outfit arrays', () => {
    const modernProfiles = {
        Modern: {
            enableOutfits: true,
            mappings: [
                {
                    name: 'Bob',
                    defaultFolder: 'bob/base',
                    outfits: ['bob/casual', { slot: 'formal', folder: 'bob/formal' }],
                },
            ],
        },
    };

    const loaded = loadProfiles(modernProfiles, PROFILE_DEFAULTS);

    assert.ok(loaded.Modern, 'profile should exist after load');
    assert.equal(loaded.Modern.enableOutfits, true, 'enableOutfits flag should persist');
    assert.equal(loaded.Modern.mappings.length, 1, 'mapping entry should be retained');

    const mapping = loaded.Modern.mappings[0];
    assert.equal(mapping.defaultFolder, 'bob/base');
    assert.equal(mapping.folder, 'bob/base');
    assert.deepEqual(mapping.outfits, ['bob/casual', { slot: 'formal', folder: 'bob/formal' }]);
    assert.notStrictEqual(mapping.outfits[1], modernProfiles.Modern.mappings[0].outfits[1], 'outfits should be cloned');

    const serialized = JSON.parse(JSON.stringify(loaded.Modern));
    const rehydrated = normalizeProfile(serialized, PROFILE_DEFAULTS);
    assert.deepEqual(rehydrated.mappings, loaded.Modern.mappings, 'modern mapping should round-trip through serialization');
    assert.equal(rehydrated.enableOutfits, true, 'modern profile should preserve enableOutfits flag');
});

test('normalizeProfile coerces disabled outfit automation to enabled', () => {
    const profile = normalizeProfile({
        mappings: [],
        enableOutfits: false,
    }, PROFILE_DEFAULTS);

    assert.equal(profile.enableOutfits, true, 'outfit automation should always normalize to enabled');
});

test('normalizeProfile preserves non-enumerable mapping identifiers', () => {
    const mapping = { name: 'Clara', defaultFolder: 'clara/base' };
    Object.defineProperty(mapping, '__cardId', {
        value: 'card-123',
        enumerable: false,
        configurable: true,
    });

    const profile = { mappings: [mapping] };
    const normalized = normalizeProfile(profile, PROFILE_DEFAULTS);

    assert.equal(normalized.mappings.length, 1, 'normalized profile should keep mapping entries');
    const descriptor = Object.getOwnPropertyDescriptor(normalized.mappings[0], '__cardId');
    assert.equal(normalized.mappings[0].__cardId, 'card-123', 'card identifier should persist through normalization');
    assert.ok(descriptor && descriptor.enumerable === false, 'card identifier should remain non-enumerable');
});

test('normalizeProfile normalizes script collection opt-ins', () => {
    const normalized = normalizeProfile({
        scriptCollections: { global: true, preset: true, scoped: false },
    }, PROFILE_DEFAULTS);

    assert.deepEqual(normalized.scriptCollections, ['global', 'preset'],
        'script collections should normalize to an ordered opt-in list');
});

test('normalizeProfile preserves fuzzy fallback tuning defaults', () => {
    const defaults = {
        ...PROFILE_DEFAULTS,
        fuzzyFallbackMaxScore: null,
        fuzzyFallbackCooldown: null,
    };

    const withCustomValues = normalizeProfile({
        fuzzyFallbackMaxScore: 0.45,
        fuzzyFallbackCooldown: 40,
    }, defaults);

    assert.equal(withCustomValues.fuzzyFallbackMaxScore, 0.45);
    assert.equal(withCustomValues.fuzzyFallbackCooldown, 40);

    const roundTrip = normalizeProfile({}, defaults);
    assert.equal(roundTrip.fuzzyFallbackMaxScore, null);
    assert.equal(roundTrip.fuzzyFallbackCooldown, null);
});

test('mappingHasIdentity accepts partially configured character slots', () => {
    assert.equal(mappingHasIdentity({}), false, 'empty mapping should not persist');
    assert.equal(mappingHasIdentity({ name: 'Draft Character' }), true, 'name-only mapping should persist');
    assert.equal(mappingHasIdentity({ defaultFolder: 'draft/base' }), true, 'default folder should mark mapping as persistent');
    assert.equal(mappingHasIdentity({ folder: 'legacy/folder' }), true, 'legacy folder field should mark mapping as persistent');
    const normalized = normalizeProfile({ mappings: [{ name: 'Temp' }] }, PROFILE_DEFAULTS).mappings[0];
    assert.equal(mappingHasIdentity(normalized, { normalized: true }), true, 'normalized mapping identity should be detected');
});

test('prepareMappingsForSave discards empty mappings without draft tracking', () => {
    const mapping = { name: '', defaultFolder: '' };
    Object.defineProperty(mapping, '__cardId', {
        value: 'card-empty',
        enumerable: false,
        configurable: true,
    });

    const prepared = prepareMappingsForSave([mapping], new Set());

    assert.equal(prepared.length, 0, 'blank mappings without draft ids should be dropped');
});

test('prepareMappingsForSave preserves draft mappings with tracked ids', () => {
    const mapping = { name: '', defaultFolder: '', outfits: ['draft/folder'] };
    Object.defineProperty(mapping, '__cardId', {
        value: 'card-draft',
        enumerable: false,
        configurable: true,
    });

    const drafts = new Set(['card-draft']);
    const prepared = prepareMappingsForSave([mapping], drafts);

    assert.equal(prepared.length, 1, 'draft mappings should persist while being edited');
    assert.deepEqual(prepared[0].outfits, ['draft/folder'], 'draft mappings should retain outfits');
    assert.equal(drafts.has('card-draft'), true, 'draft id should remain tracked until mapping gains identity');
});

test('prepareMappingsForSave clears draft tracking once mapping gains identity', () => {
    const mapping = { name: 'Finished', defaultFolder: '', outfits: [] };
    Object.defineProperty(mapping, '__cardId', {
        value: 'card-finished',
        enumerable: false,
        configurable: true,
    });

    const drafts = new Set(['card-finished']);
    const prepared = prepareMappingsForSave([mapping], drafts);

    assert.equal(prepared.length, 1, 'completed mappings should be preserved');
    assert.equal(drafts.has('card-finished'), false, 'draft tracking should clear after mapping gains identity');
});
