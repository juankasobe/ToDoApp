import { TestBed } from '@angular/core/testing';
import type { Database } from 'sql.js';
import initSqlJs from 'sql.js';

import { SQLiteTaskRepository } from '../data-access/sqlite-task.repository';
import { SQLiteService } from './sqlite.service';

class SqlJsConnection {
  constructor(private readonly database: Database) {}

  async execute(statement: string): Promise<void> {
    this.database.run(statement);
  }

  async run(statement: string, values?: unknown[]): Promise<void> {
    this.database.run(statement, values as never);
  }

  async query(statement: string, values?: unknown[]): Promise<{ values: Record<string, unknown>[] }> {
    const result = this.database.exec(statement, values as never)[0];

    return {
      values: result
        ? result.values.map((row) => result.columns.reduce<Record<string, unknown>>((value, column, index) => {
          value[column] = row[index];
          return value;
        }, {}))
        : [],
    };
  }
}

describe('SQLiteService SQL integration', () => {
  let SQL: Awaited<ReturnType<typeof initSqlJs>>;

  beforeAll(async () => {
    SQL = await initSqlJs({
      locateFile: () => '/base/node_modules/sql.js/dist/sql-wasm.wasm',
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('enforces the fresh default and CHECK constraint in SQLite', async () => {
    const database = new SQL.Database();
    const connection = new SqlJsConnection(database);
    const service = new SQLiteService();

    await (service as never as { applySchema(db: SqlJsConnection): Promise<void> }).applySchema(connection);
    await connection.execute(`INSERT INTO tasks (id, title, created_at) VALUES ('fresh', 'Fresh task', '2026-07-15T10:00:00.000Z')`);

    expect((await connection.query(`SELECT priority FROM tasks WHERE id = 'fresh'`)).values).toEqual([{ priority: 'medium' }]);
    expect(() => database.run(`UPDATE tasks SET priority = 'invalid' WHERE id = 'fresh'`)).toThrow();

    database.close();
  });

  it('migrates a pre-priority database with durable priority guards and preserves newest-first repository ordering', async () => {
    const database = new SQL.Database();
    const connection = new SqlJsConnection(database);
    const service = new SQLiteService();

    database.run(`
      CREATE TABLE categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
         completed INTEGER NOT NULL DEFAULT 0,
         category_id TEXT NULL,
         created_at TEXT NOT NULL
       );
       INSERT INTO tasks (id, title, completed, category_id, created_at) VALUES
         ('older-high', 'Older', 1, 'home', '2026-07-14T10:00:00.000Z'),
         ('newer-low', 'Newer', 0, NULL, '2026-07-15T10:00:00.000Z');
     `);

    await (service as never as { applySchema(db: SqlJsConnection): Promise<void> }).applySchema(connection);
    await (service as never as { applySchema(db: SqlJsConnection): Promise<void> }).applySchema(connection);
    await connection.execute(`INSERT INTO tasks (id, title, created_at) VALUES ('migrated-default', 'Migrated default task', '2026-07-16T10:00:00.000Z')`);

    expect((await connection.query("SELECT name FROM pragma_table_info('tasks') WHERE name = 'priority'")).values).toEqual([{ name: 'priority' }]);
    expect((await connection.query("SELECT priority FROM tasks WHERE id = 'migrated-default'")).values).toEqual([{ priority: 'medium' }]);
    await connection.execute("DELETE FROM tasks WHERE id = 'migrated-default'");
    expect((await connection.query('SELECT id, title, completed, category_id, created_at, priority FROM tasks ORDER BY id')).values).toEqual([
      { id: 'newer-low', title: 'Newer', completed: 0, category_id: null, created_at: '2026-07-15T10:00:00.000Z', priority: 'medium' },
      { id: 'older-high', title: 'Older', completed: 1, category_id: 'home', created_at: '2026-07-14T10:00:00.000Z', priority: 'medium' },
    ]);
    expect((await connection.query("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name")).values.map((row) => row['name'])).toEqual([
      'tasks_priority_insert_guard',
      'tasks_priority_update_guard',
    ]);
    expect(() => database.run(`INSERT INTO tasks (id, title, created_at, priority) VALUES ('invalid-insert', 'Invalid', '2026-07-16T10:00:00.000Z', 'invalid')`)).toThrow();
    expect(() => database.run(`UPDATE tasks SET priority = 'invalid' WHERE id = 'newer-low'`)).toThrow();

    database.run(`UPDATE tasks SET priority = 'high' WHERE id = 'older-high'; UPDATE tasks SET priority = 'low' WHERE id = 'newer-low';`);
    TestBed.configureTestingModule({
      providers: [
        SQLiteTaskRepository,
        { provide: SQLiteService, useValue: { getDatabase: () => Promise.resolve(connection) } },
      ],
    });

    const tasks = await TestBed.inject(SQLiteTaskRepository).list();

    expect(tasks.map((task) => task.id)).toEqual(['newer-low', 'older-high']);
    database.close();
  });
});
