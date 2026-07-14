import { TestBed } from '@angular/core/testing';

import { SQLiteCategoryRepository } from './sqlite-category.repository';
import { SQLiteService } from '../storage/sqlite.service';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';

type QueryResult = { values?: Record<string, unknown>[] };
type RunResult = { changes?: { changes?: number } };

function expectAtomicNoCaseGuard(
  run: { statement: string; values?: unknown[] },
  operation: 'INSERT INTO categories' | 'UPDATE categories',
  values: unknown[],
): void {
  expect(run.statement).toContain(operation);
  expect(run.statement).toContain('NOT EXISTS');
  expect(run.statement).toContain('COLLATE NOCASE');
  expect(run.values).toEqual(values);
}

class FakeDatabase {
  readonly queries: Array<{ statement: string; values?: unknown[] }> = [];
  readonly runs: Array<{ statement: string; values?: unknown[] }> = [];
  private queryResults: QueryResult[] = [];
  private runResults: RunResult[] = [];

  queueQueryResult(result: QueryResult): void {
    this.queryResults.push(result);
  }

  queueRunResult(result: RunResult): void {
    this.runResults.push(result);
  }

  async query(statement: string, values?: unknown[]): Promise<QueryResult> {
    this.queries.push({ statement, values });
    return this.queryResults.shift() ?? { values: [] };
  }

  async run(statement: string, values?: unknown[]): Promise<RunResult> {
    this.runs.push({ statement, values });
    return this.runResults.shift() ?? { changes: { changes: 1 } };
  }
}

function createRepository(db: FakeDatabase): SQLiteCategoryRepository {
  TestBed.configureTestingModule({
    providers: [
      SQLiteCategoryRepository,
      { provide: SQLiteService, useValue: { getDatabase: () => Promise.resolve(db) } },
    ],
  });

  return TestBed.inject(SQLiteCategoryRepository);
}

describe('SQLiteCategoryRepository', () => {
  it('creates and lists local categories ordered by creation time', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({
      values: [{ id: 'category-1', name: 'Home', created_at: '2026-07-09T20:00:00.000Z' }],
    });
    const repository = createRepository(db);

    const created = await repository.create({ name: 'Home' });
    const categories = await repository.list();

    expect(created.name).toBe('Home');
    expectAtomicNoCaseGuard(db.runs[0], 'INSERT INTO categories', [jasmine.any(String), 'Home', jasmine.any(String), 'Home']);
    expect(categories).toEqual([{ id: 'category-1', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]);
  });

  it('atomically rejects a case-insensitive duplicate while creating a category', async () => {
    const db = new FakeDatabase();
    db.queueRunResult({ changes: { changes: 0 } });
    const repository = createRepository(db);

    await expectAsync(repository.create({ name: 'work' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.DUPLICATE_NAME);

    expect(db.runs.length).toBe(1);
    expectAtomicNoCaseGuard(db.runs[0], 'INSERT INTO categories', [jasmine.any(String), 'work', jasmine.any(String), 'work']);
  });

  it('atomically updates a category when no other normalized name matches', async () => {
    const db = new FakeDatabase();
    db.queueRunResult({ changes: { changes: 1 } });
    db.queueQueryResult({
      values: [{ id: 'category-1', name: 'Work', created_at: '2026-07-09T20:00:00.000Z' }],
    });
    const repository = createRepository(db);

    const category = await repository.update('category-1', { name: 'Work' });

    expect(db.runs.length).toBe(1);
    expectAtomicNoCaseGuard(db.runs[0], 'UPDATE categories', ['Work', 'category-1', 'Work', 'category-1']);
    expect(category).toEqual({ id: 'category-1', name: 'Work', createdAt: '2026-07-09T20:00:00.000Z' });
  });

  it('allows a category to retain its own normalized name', async () => {
    const db = new FakeDatabase();
    db.queueRunResult({ changes: { changes: 1 } });
    db.queueQueryResult({
      values: [{ id: 'category-1', name: 'Work', created_at: '2026-07-09T20:00:00.000Z' }],
    });
    const repository = createRepository(db);

    await expectAsync(repository.update('category-1', { name: 'Work' })).toBeResolvedTo(
      { id: 'category-1', name: 'Work', createdAt: '2026-07-09T20:00:00.000Z' },
    );
  });

  it('distinguishes a duplicate rename from a missing category after an atomic guarded update', async () => {
    const db = new FakeDatabase();
    db.queueRunResult({ changes: { changes: 0 } });
    db.queueQueryResult({ values: [{ id: 'category-2', name: 'Personal', created_at: '2026-07-09T20:00:00.000Z' }] });
    const repository = createRepository(db);

    await expectAsync(repository.update('category-2', { name: 'work' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.DUPLICATE_NAME);

    expect(db.runs[0]?.values).toEqual(['work', 'category-2', 'work', 'category-2']);
  });

  it('reports a missing category after its atomic guarded update affects no row', async () => {
    const db = new FakeDatabase();
    db.queueRunResult({ changes: { changes: 0 } });
    db.queueQueryResult({ values: [] });
    const repository = createRepository(db);

    await expectAsync(repository.update('missing', { name: 'Projects' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.NOT_FOUND);

    expect(db.runs.length).toBe(1);
    expectAtomicNoCaseGuard(db.runs[0], 'UPDATE categories', ['Projects', 'missing', 'Projects', 'missing']);
  });

  it('blocks deleting a category that still has tasks and leaves rows unchanged', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 2 }] });
    const repository = createRepository(db);

    const result = await repository.delete('category-1');

    expect(result).toEqual({ ok: false, reason: CATEGORY_ERROR_CODE.NOT_EMPTY });
    expect(db.runs.length).toBe(0);
  });

  it('deletes an empty category', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 0 }] });
    const repository = createRepository(db);

    const result = await repository.delete('category-1');

    expect(result).toEqual({ ok: true });
    expect(db.runs[0].statement).toContain('DELETE FROM categories');
    expect(db.runs[0].values).toEqual(['category-1']);
  });
});
