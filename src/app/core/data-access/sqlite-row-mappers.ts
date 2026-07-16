import { Category } from '../../categories/models/category.model';
import { DEFAULT_TASK_PRIORITY, isTaskPriority, Task } from '../../tasks/models/task.model';
import { isSqliteTrue } from './sqlite-boolean';

type SqliteRow = Record<string, unknown>;

export function mapTaskRow(row: SqliteRow): Task {
  const priority = row['priority'];

  return {
    id: String(row['id']),
    title: String(row['title']),
    completed: isSqliteTrue(row['completed']),
    categoryId: row['category_id'] === null || row['category_id'] === undefined ? null : String(row['category_id']),
    createdAt: String(row['created_at']),
    priority: isTaskPriority(priority) ? priority : DEFAULT_TASK_PRIORITY,
    dueDate: row['due_date'] === null || row['due_date'] === undefined ? null : String(row['due_date']),
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
