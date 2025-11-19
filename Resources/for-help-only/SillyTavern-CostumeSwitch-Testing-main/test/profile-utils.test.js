import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizePatternSlot,
    preparePatternSlotsForSave,
    reconcilePatternSlotReferences,
} from '../profile-utils.js';

test('reconcilePatternSlotReferences reuses existing slot objects and updates fields', () => {
    const existingSlot = normalizePatternSlot({ name: 'Alice', aliases: ['Al'] });
    Object.defineProperty(existingSlot, '__slotId', {
        value: 'slot-1',
        enumerable: false,
        configurable: true,
        writable: true,
    });

    const existingSlots = [existingSlot];
    const prepared = preparePatternSlotsForSave(existingSlots, new Set());
    assert.equal(prepared.length, 1);

    const nextSlot = normalizePatternSlot({ name: 'Alice', aliases: ['Al', 'Aly'] });
    Object.defineProperty(nextSlot, '__slotId', {
        value: 'slot-1',
        enumerable: false,
        configurable: true,
        writable: true,
    });

    const reconciled = reconcilePatternSlotReferences(existingSlots, [nextSlot]);
    assert.equal(reconciled[0], existingSlot, 'existing reference should be reused');
    assert.deepEqual(reconciled[0].aliases, ['Al', 'Aly']);
    assert.notEqual(reconciled[0].aliases, nextSlot.aliases, 'aliases should be cloned');

    const updatedPrepared = preparePatternSlotsForSave(reconciled, new Set());
    assert.deepEqual(updatedPrepared[0].aliases, ['Al', 'Aly']);
});

test('reconcilePatternSlotReferences returns new objects for unseen slots', () => {
    const existingSlot = normalizePatternSlot({ name: 'Alice', aliases: ['Al'] });
    Object.defineProperty(existingSlot, '__slotId', {
        value: 'slot-1',
        enumerable: false,
        configurable: true,
        writable: true,
    });

    const newSlot = normalizePatternSlot({ name: 'Bob', aliases: ['Bobby'] });
    Object.defineProperty(newSlot, '__slotId', {
        value: 'slot-2',
        enumerable: false,
        configurable: true,
        writable: true,
    });

    const reconciled = reconcilePatternSlotReferences([existingSlot], [newSlot]);
    assert.notEqual(reconciled[0], existingSlot, 'new slot should not reuse unrelated reference');
    assert.equal(reconciled[0], newSlot, 'new slot should be returned as provided');
});
