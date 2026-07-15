import { mapTaskRow } from './sqlite-row-mappers';

describe('mapTaskRow', () => {
  it('maps a valid persisted priority without masking it', () => {
    expect(mapTaskRow({
      id: 'task-1', title: 'Buy milk', completed: 0, category_id: null,
      created_at: '2026-07-09T20:00:00.000Z', priority: 'low',
    }).priority).toBe('low');
  });

  it('falls back to medium for missing, null, or corrupt persisted priorities', () => {
    const legacyRow = { id: 'task-1', title: 'Buy milk', completed: 0, category_id: null, created_at: '2026-07-09T20:00:00.000Z' };
    const corruptRow = { ...legacyRow, priority: 'urgent' };
    const nullRow = { ...legacyRow, priority: null };

    expect(mapTaskRow(legacyRow).priority).toBe('medium');
    expect(mapTaskRow(corruptRow).priority).toBe('medium');
    expect(mapTaskRow(nullRow).priority).toBe('medium');
  });
});
