import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DATABASE_NAME = 'personal_to_do';
const DATABASE_VERSION = 1;

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
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
    `);
  }

  private async openDatabase(): Promise<SQLiteDBConnection> {
    if (this.database) {
      return this.database;
    }

    const existingConnection = await this.sqlite.isConnection(DATABASE_NAME, false);
    this.database = existingConnection.result
      ? await this.sqlite.retrieveConnection(DATABASE_NAME, false)
      : await this.sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false);

    await this.database.open();
    await this.applySchema(this.database);

    return this.database;
  }
}
