import { TestBed } from '@angular/core/testing';

import { SQLiteCategoryRepository } from './sqlite-category.repository';
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
    expect(db.runs[0].statement).toContain('INSERT INTO categories');
    expect(categories).toEqual([{ id: 'category-1', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]);
  });

  it('blocks deleting a category that still has tasks and leaves rows unchanged', async () => {
    const db = new FakeDatabase();
    db.queueQueryResult({ values: [{ count: 2 }] });
    const repository = createRepository(db);

    const result = await repository.delete('category-1');

    expect(result).toEqual({ ok: false, reason: 'category-not-empty' });
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
