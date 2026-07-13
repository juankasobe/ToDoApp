import { Injectable, inject } from '@angular/core';

import { SQLiteService } from '../storage/sqlite.service';
import { CreateTaskInput, TaskListFilter, TaskRepository, UpdateTaskInput } from './task.repository';
import { createLocalId } from './local-id';
import { SQLITE_FALSE, SQLITE_TRUE } from './sqlite-boolean';
import { mapTaskRow, readCount } from './sqlite-row-mappers';
import { Task } from '../../tasks/models/task.model';

@Injectable({ providedIn: 'root' })
export class SQLiteTaskRepository implements TaskRepository {
  private readonly sqliteService = inject(SQLiteService);

  async list(filter?: TaskListFilter): Promise<Task[]> {
    const db = await this.sqliteService.getDatabase();
    const where = this.buildWhere(filter);
    const result = await db.query(
      `SELECT id, title, completed, category_id, created_at
       FROM tasks${where.clause}
       ORDER BY created_at DESC`,
      where.values,
    );

    return (result.values ?? []).map(mapTaskRow);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const db = await this.sqliteService.getDatabase();

    if (input.categoryId !== null) {
      await this.assertCategoryExists(input.categoryId);
    }

    const task: Task = {
      id: createLocalId(),
      title: input.title,
      completed: false,
      categoryId: input.categoryId,
      createdAt: new Date().toISOString(),
    };

    await db.run(
      `INSERT INTO tasks (id, title, completed, category_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [task.id, task.title, SQLITE_FALSE, task.categoryId, task.createdAt],
    );

    return task;
  }

  async getById(id: string): Promise<Task> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.query(
      'SELECT id, title, completed, category_id, created_at FROM tasks WHERE id = ?',
      [id],
    );
    const task = result.values?.[0];

    if (!task) {
      throw new Error('task-not-found');
    }

    return mapTaskRow(task);
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const db = await this.sqliteService.getDatabase();

    if (input.categoryId !== null) {
      await this.assertCategoryExists(input.categoryId);
    }

    await db.run('UPDATE tasks SET title = ?, category_id = ? WHERE id = ?', [input.title, input.categoryId, id]);

    return this.getById(id);
  }

  async setCompleted(id: string, completed: boolean): Promise<Task> {
    const db = await this.sqliteService.getDatabase();
    await db.run('UPDATE tasks SET completed = ? WHERE id = ?', [completed ? SQLITE_TRUE : SQLITE_FALSE, id]);
    const result = await db.query(
      'SELECT id, title, completed, category_id, created_at FROM tasks WHERE id = ?',
      [id],
    );
    const task = result.values?.[0];

    if (!task) {
      throw new Error('task-not-found');
    }

    return mapTaskRow(task);
  }

  async delete(id: string): Promise<void> {
    const db = await this.sqliteService.getDatabase();
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.query('SELECT COUNT(*) as count FROM categories WHERE id = ?', [categoryId]);

    if (readCount(result.values?.[0]) === 0) {
      throw new Error('category-not-found');
    }
  }

  private buildWhere(filter?: TaskListFilter): { clause: string; values: string[] } {
    if (filter?.categoryId !== undefined) {
      return filter.categoryId === null
        ? { clause: ' WHERE category_id IS NULL', values: [] }
        : { clause: ' WHERE category_id = ?', values: [filter.categoryId] };
    }

    return { clause: '', values: [] };
  }
}
