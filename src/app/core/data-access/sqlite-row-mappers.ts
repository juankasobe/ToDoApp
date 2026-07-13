import { Category } from '../../categories/models/category.model';
import { Task } from '../../tasks/models/task.model';
import { isSqliteTrue } from './sqlite-boolean';

type SqliteRow = Record<string, unknown>;

export function mapTaskRow(row: SqliteRow): Task {
  return {
    id: String(row['id']),
    title: String(row['title']),
    completed: isSqliteTrue(row['completed']),
    categoryId: row['category_id'] === null || row['category_id'] === undefined ? null : String(row['category_id']),
    createdAt: String(row['created_at']),
  };
}

export function mapCategoryRow(row: SqliteRow): Category {
  return {
    id: String(row['id']),
    name: String(row['name']),
    createdAt: String(row['created_at']),
  };
}

export function readCount(row: SqliteRow | undefined): number {
  return Number(row?.['count'] ?? 0);
}
