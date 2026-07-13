import { TestBed } from '@angular/core/testing';

import { SQLiteTaskRepository } from './sqlite-task.repository';
import { SQLiteService } from '../storage/sqlite.service';

type QueryResult = { values?: Record<string, unknown>[] };

class FakeDatabase {
  readonly queries: Array<{ statement: string; values?: unknown[] }> = [];
  readonly runs: Array<{ statement: string; values?: unknown[] }> = [];
  private queryResults: QueryResult[] = [];

  queueQueryResult(result: QueryResult): void {
    this.queryResults.push(result);
  }

  async query(statement: string, values?: unknown[]): Promise<QueryResult> {
    this.queries.push({ statement, values });
    return this.queryResults.shift() ?? { values: [] };
  }

  async run(statement: string, values?: unknown[]): Promise<void> {
    this.runs.push({ statement, values });
  }
}

function createRepository(db: FakeDatabase): SQLiteTaskRepository {
  TestBed.configureTestingModule({
    providers: [
      SQLiteTaskRepository,
      { provide: SQLiteService, useValue: { getDatabase: () => Promise.resolve(db) } },
    ],
  });

  return TestBed.inject(SQLiteTaskRepository);
}

describe('SQLiteTaskRepository', () => {
  it('creates an uncategorized incomplete task locally', async () => {
    const db = new FakeDatabase();
    const repository = createRepository(db);

    const task = await repository.create({ title: 'Buy milk', categoryId: null });

    expect(task.title).toBe('Buy milk');
    expect(task.completed).toBeFalse();
    expect(task.categoryId).toBeNull();
    expect(db.runs[0].statement).toContain('INSERT INTO tasks');
    expect(db.runs[0].values?.slice(1, 4)).toEqual(['Buy milk', 0, null]);
  });

  it('rejects a non-null category id when the category is missing', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 0 }] });
    const repository = createRepository(db);

    await expectAsync(repository.create({ title: 'Plan workout', categoryId: 'missing-category' }))
      .toBeRejectedWithError('category-not-found');
    expect(db.runs.length).toBe(0);
  });

  it('lists category-scoped tasks ordered by creation time', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'task-1', title: 'Plan workout', completed: 1, category_id: 'health', created_at: '2026-07-09T20:00:00.000Z' },
      ],
    });
    const repository = createRepository(db);

    const tasks = await repository.list({ categoryId: 'health' });

    expect(tasks).toEqual([
      { id: 'task-1', title: 'Plan workout', completed: true, categoryId: 'health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);
    expect(db.queries[0].statement).toContain('WHERE category_id = ?');
    expect(db.queries[0].values).toEqual(['health']);
  });

  it('lists uncategorized tasks with an is-null filter', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'task-2', title: 'Inbox item', completed: 0, category_id: null, created_at: '2026-07-09T21:00:00.000Z' },
      ],
    });
    const repository = createRepository(db);

    const tasks = await repository.list({ categoryId: null });

    expect(tasks).toEqual([
      { id: 'task-2', title: 'Inbox item', completed: false, categoryId: null, createdAt: '2026-07-09T21:00:00.000Z' },
    ]);
    expect(db.queries[0].statement).toContain('WHERE category_id IS NULL');
    expect(db.queries[0].values).toEqual([]);
  });

  it('toggles completion and deletes tasks without changing categories', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [{ id: 'task-1', title: 'Buy milk', completed: 0, category_id: null, created_at: '2026-07-09T20:00:00.000Z' }],
    });
    const repository = createRepository(db);

    const toggled = await repository.setCompleted('task-1', false);
    await repository.delete('task-1');

    expect(toggled.completed).toBeFalse();
    expect(db.runs[0].statement).toContain('UPDATE tasks');
    expect(db.runs[1].statement).toContain('DELETE FROM tasks');
  });
});
