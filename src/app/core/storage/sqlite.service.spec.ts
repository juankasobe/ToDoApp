import { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { SQLiteService } from './sqlite.service';

type PersistedTaskRow = Record<string, unknown>;

class SchemaDatabase {
  readonly executed: string[] = [];
  readonly columns: string[];

  constructor(
    readonly rows: PersistedTaskRow[],
    private failSchema = false,
    private readonly schemaAlreadyExists = false,
    hasPriorityColumn = false,
    hasDueDateColumn = false,
  ) {
    this.columns = ['id', 'title', 'completed', 'category_id', 'created_at'];
    if (hasPriorityColumn) {
      this.columns.push('priority');
    }
    if (hasDueDateColumn) {
      this.columns.push('due_date');
    }
  }

  async open(): Promise<void> {}

  async execute(statement: string): Promise<unknown> {
    this.executed.push(statement);

    if (this.failSchema) {
      this.failSchema = false;
      throw new Error('schema-failed');
    }

    if (statement.includes('CREATE TABLE IF NOT EXISTS tasks') && !this.schemaAlreadyExists && !this.columns.includes('priority')) {
      this.columns.push('priority');
    }

    if (statement.includes('ALTER TABLE tasks ADD COLUMN priority') && !this.columns.includes('priority')) {
      this.columns.push('priority');
      this.rows.forEach((row) => row['priority'] = 'medium');
    }

    if (statement.includes('ALTER TABLE tasks ADD COLUMN due_date') && !this.columns.includes('due_date')) {
      this.columns.push('due_date');
      this.rows.forEach((row) => row['due_date'] = null);
    }

    if (/UPDATE\s+tasks\s+SET\s+priority/.test(statement)) {
      this.rows.forEach((row) => {
        if (!['low', 'medium', 'high'].includes(row['priority'] as string)) {
          row['priority'] = 'medium';
        }
      });
    }

    return {};
  }

  async query(statement: string): Promise<{ values: PersistedTaskRow[] }> {
    if (statement === 'PRAGMA table_info(tasks)') {
      return { values: this.columns.map((name) => ({ name })) };
    }

    return { values: [] };
  }
}

function configureNativeConnection(service: SQLiteService, database: SchemaDatabase, createConnection = jasmine.createSpy('createConnection').and.resolveTo(database)): jasmine.Spy {
  const sqlite = {
    isConnection: jasmine.createSpy('isConnection').and.resolveTo({ result: false }),
    createConnection,
    retrieveConnection: jasmine.createSpy('retrieveConnection'),
    closeConnection: jasmine.createSpy('closeConnection').and.resolveTo(),
  };
  (service as any).sqlite = sqlite;
  return sqlite.closeConnection;
}

describe('SQLiteService', () => {
  it('clears a failed initialization so startup retry opens the database again', async () => {
    const service = new SQLiteService();
    const database = {} as SQLiteDBConnection;
    const openDatabase = spyOn<any>(service, 'openDatabase').and.returnValues(
      Promise.reject(new Error('startup-failed')),
      Promise.resolve(database),
    );

    await expectAsync(service.initialize()).toBeRejectedWithError('startup-failed');
    await expectAsync(service.initialize()).toBeResolvedTo(database);

    expect(openDatabase).toHaveBeenCalledTimes(2);
  });

  it('creates the priority column for fresh task schemas', async () => {
    const service = new SQLiteService();
    const execute = jasmine.createSpy('execute').and.resolveTo({});
    const query = jasmine.createSpy('query').and.resolveTo({ values: [{ name: 'priority' }] });
    const database = { execute, query } as unknown as SQLiteDBConnection;

    await (service as any).applySchema(database);

    expect(execute.calls.allArgs().map(([statement]) => statement).join('\n')).toContain("priority TEXT NOT NULL DEFAULT 'medium'");
  });

  it('creates a nullable due-date column for fresh task schemas', async () => {
    const service = new SQLiteService();
    const execute = jasmine.createSpy('execute').and.resolveTo({});
    const query = jasmine.createSpy('query').and.resolveTo({ values: [{ name: 'priority' }, { name: 'due_date' }] });
    const database = { execute, query } as unknown as SQLiteDBConnection;

    await (service as any).applySchema(database);

    expect(execute.calls.allArgs().map(([statement]) => statement).join('\n')).toContain('due_date TEXT NULL');
  });

  it('adds a missing priority column once while retaining the existing task schema', async () => {
    const service = new SQLiteService();
    const execute = jasmine.createSpy('execute').and.resolveTo({});
    const query = jasmine.createSpy('query').and.returnValues(
      Promise.resolve({ values: [{ name: 'id' }, { name: 'title' }, { name: 'completed' }, { name: 'category_id' }, { name: 'created_at' }] }),
      Promise.resolve({ values: [{ name: 'id' }, { name: 'title' }, { name: 'completed' }, { name: 'category_id' }, { name: 'created_at' }, { name: 'priority' }] }),
    );
    const database = { execute, query } as unknown as SQLiteDBConnection;

    await (service as any).applySchema(database);
    await (service as any).applySchema(database);

    const statements = execute.calls.allArgs().map(([statement]) => statement);
    expect(query).toHaveBeenCalledWith('PRAGMA table_info(tasks)');
    expect(statements.filter((statement) => statement.includes('ALTER TABLE tasks ADD COLUMN priority')).length).toBe(1);
    expect(statements.join('\n')).toContain("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
  });

  it('initializes fresh schemas with a constrained priority column', async () => {
    const service = new SQLiteService();
    const database = new SchemaDatabase([]);
    configureNativeConnection(service, database);

    await service.initialize();

    expect(database.executed.join('\n')).toContain("priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))");
  });

  it('migrates legacy rows to medium without changing their other persisted fields and remains idempotent', async () => {
    const legacyRows: PersistedTaskRow[] = [
      { id: 'low-missing', title: 'Buy milk', completed: 1, category_id: 'home', created_at: '2026-07-09T20:00:00.000Z' },
      { id: 'second-missing', title: 'Plan workout', completed: 0, category_id: null, created_at: '2026-07-10T20:00:00.000Z' },
    ];
    const database = new SchemaDatabase(legacyRows, false, true);
    const firstService = new SQLiteService();
    const createConnection = jasmine.createSpy('createConnection').and.resolveTo(database);
    configureNativeConnection(firstService, database, createConnection);

    await firstService.initialize();

    expect(legacyRows).toEqual([
      { id: 'low-missing', title: 'Buy milk', completed: 1, category_id: 'home', created_at: '2026-07-09T20:00:00.000Z', priority: 'medium', due_date: null },
      { id: 'second-missing', title: 'Plan workout', completed: 0, category_id: null, created_at: '2026-07-10T20:00:00.000Z', priority: 'medium', due_date: null },
    ]);

    const retryService = new SQLiteService();
    configureNativeConnection(retryService, database, createConnection);
    await retryService.initialize();

    expect(database.executed.filter((statement) => statement.includes('ALTER TABLE tasks ADD COLUMN priority'))).toHaveSize(1);
  });

  it('adds a nullable due date to legacy rows without changing existing fields and remains idempotent', async () => {
    const legacyRows: PersistedTaskRow[] = [
      { id: 'dated-later', title: 'Buy milk', completed: 1, category_id: 'home', created_at: '2026-07-09T20:00:00.000Z', priority: 'low' },
      { id: 'undated', title: 'Plan workout', completed: 0, category_id: null, created_at: '2026-07-10T20:00:00.000Z', priority: 'high' },
    ];
    const database = new SchemaDatabase(legacyRows, false, true, true);
    const createConnection = jasmine.createSpy('createConnection').and.resolveTo(database);
    const firstService = new SQLiteService();
    configureNativeConnection(firstService, database, createConnection);

    await firstService.initialize();

    expect(legacyRows).toEqual([
      { id: 'dated-later', title: 'Buy milk', completed: 1, category_id: 'home', created_at: '2026-07-09T20:00:00.000Z', priority: 'low', due_date: null },
      { id: 'undated', title: 'Plan workout', completed: 0, category_id: null, created_at: '2026-07-10T20:00:00.000Z', priority: 'high', due_date: null },
    ]);

    const retryService = new SQLiteService();
    configureNativeConnection(retryService, database, createConnection);
    await retryService.initialize();

    expect(database.executed.filter((statement) => statement.includes('ALTER TABLE tasks ADD COLUMN due_date'))).toHaveSize(1);
  });

  it('normalizes null and invalid legacy priority values while preserving valid priorities', async () => {
    const rows = [
      { id: 'null', title: 'Buy milk', completed: 0, category_id: null, created_at: '2026-07-09T20:00:00.000Z', priority: null },
      { id: 'invalid', title: 'Plan workout', completed: 1, category_id: 'health', created_at: '2026-07-10T20:00:00.000Z', priority: 'urgent' },
      { id: 'high', title: 'Pay bill', completed: 0, category_id: 'home', created_at: '2026-07-11T20:00:00.000Z', priority: 'high' },
    ];
    const service = new SQLiteService();
    const database = new SchemaDatabase(rows, false, true, true);
    configureNativeConnection(service, database);

    await service.initialize();

    expect(rows.map((row) => row['priority'])).toEqual(['medium', 'medium', 'high']);
  });

  it('closes a connection whose schema setup fails so retry opens a usable replacement', async () => {
    const service = new SQLiteService();
    const brokenDatabase = new SchemaDatabase([], true);
    const usableDatabase = new SchemaDatabase([]);
    const createConnection = jasmine.createSpy('createConnection').and.returnValues(
      Promise.resolve(brokenDatabase),
      Promise.resolve(usableDatabase),
    );
    const closeConnection = configureNativeConnection(service, brokenDatabase, createConnection);

    await expectAsync(service.initialize()).toBeRejectedWithError('schema-failed');
    await expectAsync(service.initialize()).toBeResolvedTo(usableDatabase as unknown as SQLiteDBConnection);

    expect(closeConnection).toHaveBeenCalledWith('personal_to_do', false);
    expect(createConnection).toHaveBeenCalledTimes(2);
  });
});
