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

  it('preserves a persisted canonical due date', () => {
    const task = mapTaskRow({
      id: 'task-1', title: 'Buy milk', completed: 0, category_id: null,
      created_at: '2026-07-09T20:00:00.000Z', priority: 'low', due_date: '2026-07-15',
    });

    expect(task.dueDate).toBe('2026-07-15');
  });

  it('normalizes missing and null persisted due dates to null', () => {
    const legacyRow = { id: 'legacy', title: 'Buy milk', completed: 0, category_id: null, created_at: '2026-07-09T20:00:00.000Z', priority: 'medium' };
    const nullRow = { ...legacyRow, due_date: null };

    expect(mapTaskRow(legacyRow).dueDate).toBeNull();
    expect(mapTaskRow(nullRow).dueDate).toBeNull();
  });
});
