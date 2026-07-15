import { TestBed } from '@angular/core/testing';

import { SQLiteTaskRepository } from './sqlite-task.repository';
import { SQLiteService } from '../storage/sqlite.service';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';

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

    const task = await repository.create({ title: 'Buy milk', categoryId: null, priority: 'low' });

    expect(task.title).toBe('Buy milk');
    expect(task.completed).toBeFalse();
    expect(task.categoryId).toBeNull();
    expect(task.priority).toBe('low');
    expect(db.runs[0].statement).toContain('INSERT INTO tasks');
    expect(db.runs[0].values).toEqual([task.id, 'Buy milk', 0, null, task.createdAt, 'low']);
  });

  it('rejects a non-null category id when the category is missing', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 0 }] });
    const repository = createRepository(db);

    await expectAsync(repository.create({ title: 'Plan workout', categoryId: 'missing-category', priority: 'medium' }))
      .toBeRejectedWithError(CATEGORY_ERROR_CODE.NOT_FOUND);
    expect(db.runs.length).toBe(0);
  });

  it('lists category-scoped tasks ordered by creation time', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'task-1', title: 'Plan workout', completed: 1, category_id: 'health', created_at: '2026-07-09T20:00:00.000Z', priority: 'high' },
      ],
    });
    const repository = createRepository(db);

    const tasks = await repository.list({ categoryId: 'health' });

    expect(tasks).toEqual([
      { id: 'task-1', title: 'Plan workout', completed: true, categoryId: 'health', createdAt: '2026-07-09T20:00:00.000Z', priority: 'high' },
    ]);
    expect(db.queries[0].statement).toContain('WHERE category_id = ?');
    expect(db.queries[0].values).toEqual(['health']);
    expect(db.queries[0].statement).toContain('priority');
    expect(db.queries[0].statement).toContain('ORDER BY created_at DESC');
  });

  it('keeps newest-first persisted order when tasks have mixed priorities', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'newest-high', title: 'Plan workout', completed: 0, category_id: null, created_at: '2026-07-10T20:00:00.000Z', priority: 'high' },
        { id: 'middle-low', title: 'Buy milk', completed: 1, category_id: 'home', created_at: '2026-07-09T20:00:00.000Z', priority: 'low' },
        { id: 'oldest-medium', title: 'Inbox item', completed: 0, category_id: null, created_at: '2026-07-08T20:00:00.000Z', priority: 'medium' },
      ],
    });
    const repository = createRepository(db);

    const tasks = await repository.list();

    expect(tasks.map((task) => [task.id, task.priority])).toEqual([
      ['newest-high', 'high'],
      ['middle-low', 'low'],
      ['oldest-medium', 'medium'],
    ]);
    expect(db.queries[0].statement).toContain('ORDER BY created_at DESC');
  });

  it('lists uncategorized tasks with an is-null filter', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'task-2', title: 'Inbox item', completed: 0, category_id: null, created_at: '2026-07-09T21:00:00.000Z', priority: 'medium' },
      ],
    });
    const repository = createRepository(db);

    const tasks = await repository.list({ categoryId: null });

    expect(tasks).toEqual([
      { id: 'task-2', title: 'Inbox item', completed: false, categoryId: null, createdAt: '2026-07-09T21:00:00.000Z', priority: 'medium' },
    ]);
    expect(db.queries[0].statement).toContain('WHERE category_id IS NULL');
    expect(db.queries[0].values).toEqual([]);
  });

  it('reads a task by id', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'task-1', title: 'Buy milk', completed: 1, category_id: 'home', created_at: '2026-07-09T20:00:00.000Z', priority: 'low' },
      ],
    });
    const repository = createRepository(db);

    const task = await repository.getById('task-1');

    expect(task).toEqual({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'home',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'low',
    });
    expect(db.queries[0].statement).toContain('WHERE id = ?');
    expect(db.queries[0].values).toEqual(['task-1']);
  });

  it('rejects a missing task by id', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [] });
    const repository = createRepository(db);

    await expectAsync(repository.getById('missing-task')).toBeRejectedWithError('task-not-found');
  });

  it('updates a task title and category while preserving identity, completion, and creation time', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 1 }] });
    db.queueQueryResult({
      values: [
        { id: 'task-1', title: 'Buy oat milk', completed: 1, category_id: 'errands', created_at: '2026-07-09T20:00:00.000Z', priority: 'high' },
      ],
    });
    const repository = createRepository(db);

    const updated = await repository.update('task-1', { title: 'Buy oat milk', categoryId: 'errands', priority: 'high' });

    expect(updated).toEqual({
      id: 'task-1',
      title: 'Buy oat milk',
      completed: true,
      categoryId: 'errands',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'high',
    });
    expect(db.runs[0].statement).toContain('UPDATE tasks');
    expect(db.runs[0].values).toEqual(['Buy oat milk', 'errands', 'high', 'task-1']);
  });

  it('clears the category without validating a null category id', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [
        { id: 'task-2', title: 'Inbox item', completed: 0, category_id: null, created_at: '2026-07-09T21:00:00.000Z', priority: 'medium' },
      ],
    });
    const repository = createRepository(db);

    const updated = await repository.update('task-2', { title: 'Inbox item', categoryId: null, priority: 'medium' });

    expect(updated.categoryId).toBeNull();
    expect(db.queries[0].statement).toContain('SELECT id, title, completed, category_id, created_at, priority FROM tasks WHERE id = ?');
    expect(db.runs[0].values).toEqual(['Inbox item', null, 'medium', 'task-2']);
  });

  it('rejects a missing category before mutating a task', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 0 }] });
    const repository = createRepository(db);

    await expectAsync(repository.update('task-1', { title: 'Plan workout', categoryId: 'missing-category', priority: 'medium' }))
      .toBeRejectedWithError(CATEGORY_ERROR_CODE.NOT_FOUND);

    expect(db.runs.length).toBe(0);
  });

  it('rejects an update when the task does not exist', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [] });
    const repository = createRepository(db);

    await expectAsync(repository.update('missing-task', { title: 'Missing', categoryId: null, priority: 'medium' }))
      .toBeRejectedWithError('task-not-found');

    expect(db.runs[0].statement).toContain('UPDATE tasks');
  });

  it('toggles completion and deletes tasks without changing categories', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [{ id: 'task-1', title: 'Buy milk', completed: 0, category_id: null, created_at: '2026-07-09T20:00:00.000Z', priority: 'medium' }],
    });
    const repository = createRepository(db);

    const toggled = await repository.setCompleted('task-1', false);
    await repository.delete('task-1');

    expect(toggled.completed).toBeFalse();
    expect(db.runs[0].statement).toContain('UPDATE tasks');
    expect(db.runs[1].statement).toContain('DELETE FROM tasks');
  });
});
