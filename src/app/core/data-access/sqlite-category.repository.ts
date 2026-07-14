import { Injectable, inject } from '@angular/core';

import { Category } from '../../categories/models/category.model';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';
import { SQLiteService } from '../storage/sqlite.service';
import { CategoryRepository, CreateCategoryInput, DeleteCategoryResult, UpdateCategoryInput } from './category.repository';
import { createLocalId } from './local-id';
import { mapCategoryRow, readCount } from './sqlite-row-mappers';

@Injectable({ providedIn: 'root' })
export class SQLiteCategoryRepository implements CategoryRepository {
  private readonly sqliteService = inject(SQLiteService);

  async list(): Promise<Category[]> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.query('SELECT id, name, created_at FROM categories ORDER BY created_at DESC');

    return (result.values ?? []).map(mapCategoryRow);
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const db = await this.sqliteService.getDatabase();
    const category: Category = {
      id: createLocalId(),
      name: input.name,
      createdAt: new Date().toISOString(),
    };

    const result = await db.run(
      'INSERT INTO categories (id, name, created_at) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE)',
      [category.id, category.name, category.createdAt, category.name],
    );

    if (result.changes?.changes === 0) {
      throw new Error(CATEGORY_ERROR_CODE.DUPLICATE_NAME);
    }

    return category;
  }

  async getById(id: string): Promise<Category> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.query('SELECT id, name, created_at FROM categories WHERE id = ?', [id]);
    const row = result.values?.[0];

    if (!row) {
      throw new Error(CATEGORY_ERROR_CODE.NOT_FOUND);
    }

    return mapCategoryRow(row);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.run(
      'UPDATE categories SET name = ? WHERE id = ? AND NOT EXISTS (SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND id <> ?)',
      [input.name, id, input.name, id],
    );

    if (result.changes?.changes === 0) {
      await this.getById(id);
      throw new Error(CATEGORY_ERROR_CODE.DUPLICATE_NAME);
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<DeleteCategoryResult> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.query('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?', [id]);

    if (readCount(result.values?.[0]) > 0) {
      return { ok: false, reason: CATEGORY_ERROR_CODE.NOT_EMPTY };
    }

    await db.run('DELETE FROM categories WHERE id = ?', [id]);

    return { ok: true };
  }
}
