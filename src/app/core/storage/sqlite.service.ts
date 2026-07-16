import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { DEFAULT_TASK_PRIORITY_SQL, TASK_PRIORITY_SQL_VALUES } from '../../tasks/models/task.model';

const DATABASE_NAME = 'personal_to_do';
const DATABASE_VERSION = 1;
const TASK_PRIORITY_INSERT_GUARD = 'tasks_priority_insert_guard';
const TASK_PRIORITY_UPDATE_GUARD = 'tasks_priority_update_guard';

@Injectable()
export class SQLiteService {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;
  private initialization?: Promise<SQLiteDBConnection>;

  get platform(): string {
    return Capacitor.getPlatform();
  }

  get isNativePlatform(): boolean {
    return this.platform === 'android' || this.platform === 'ios';
  }

  async initialize(): Promise<SQLiteDBConnection> {
    this.initialization ??= this.openDatabase().catch((error: unknown) => {
      this.initialization = undefined;
      this.database = undefined;
      throw error;
    });

    return this.initialization;
  }

  async getDatabase(): Promise<SQLiteDBConnection> {
    return this.initialize();
  }

  async createSchema(): Promise<void> {
    const db = await this.getDatabase();
    await this.applySchema(db);
  }

  private async applySchema(db: SQLiteDBConnection): Promise<void> {

    await db.execute('PRAGMA foreign_keys = ON;');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        category_id TEXT NULL,
        created_at TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT ${DEFAULT_TASK_PRIORITY_SQL} CHECK (priority IN (${TASK_PRIORITY_SQL_VALUES})),
        due_date TEXT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
    `);

    const columns = await db.query('PRAGMA table_info(tasks)');
    const hasPriority = columns.values?.some((column) => column['name'] === 'priority');
    const hasDueDate = columns.values?.some((column) => column['name'] === 'due_date');

    if (!hasPriority) {
      await db.execute(`ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT ${DEFAULT_TASK_PRIORITY_SQL}`);
    }

    if (!hasDueDate) {
      await db.execute('ALTER TABLE tasks ADD COLUMN due_date TEXT NULL');
    }

    await db.execute(`UPDATE tasks
      SET priority = ${DEFAULT_TASK_PRIORITY_SQL}
      WHERE priority IS NULL OR priority NOT IN (${TASK_PRIORITY_SQL_VALUES})`);

    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS ${TASK_PRIORITY_INSERT_GUARD}
      BEFORE INSERT ON tasks
      FOR EACH ROW WHEN NEW.priority IS NULL OR NEW.priority NOT IN (${TASK_PRIORITY_SQL_VALUES})
      BEGIN
        SELECT RAISE(ABORT, 'invalid-task-priority');
      END;

      CREATE TRIGGER IF NOT EXISTS ${TASK_PRIORITY_UPDATE_GUARD}
      BEFORE UPDATE OF priority ON tasks
      FOR EACH ROW WHEN NEW.priority IS NULL OR NEW.priority NOT IN (${TASK_PRIORITY_SQL_VALUES})
      BEGIN
        SELECT RAISE(ABORT, 'invalid-task-priority');
      END;
    `);
  }

  private async openDatabase(): Promise<SQLiteDBConnection> {
    if (this.database) {
      return this.database;
    }

    let database: SQLiteDBConnection | undefined;

    try {
      const existingConnection = await this.sqlite.isConnection(DATABASE_NAME, false);
      database = existingConnection.result
        ? await this.sqlite.retrieveConnection(DATABASE_NAME, false)
        : await this.sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false);

      this.database = database;
      await database.open();
      await this.applySchema(database);

      return database;
    } catch (error) {
      this.database = undefined;

      if (database) {
        await this.sqlite.closeConnection(DATABASE_NAME, false).catch(() => undefined);
      }

      throw error;
    }
  }
}
