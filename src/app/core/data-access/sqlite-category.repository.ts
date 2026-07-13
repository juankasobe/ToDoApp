import { Injectable, inject } from '@angular/core';

import { Category } from '../../categories/models/category.model';
import { SQLiteService } from '../storage/sqlite.service';
import { CategoryRepository, CreateCategoryInput, DeleteCategoryResult } from './category.repository';
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

    await db.run(
      'INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)',
      [category.id, category.name, category.createdAt],
    );

    return category;
  }

  async delete(id: string): Promise<DeleteCategoryResult> {
    const db = await this.sqliteService.getDatabase();
    const result = await db.query('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?', [id]);

    if (readCount(result.values?.[0]) > 0) {
      return { ok: false, reason: 'category-not-empty' };
    }

    await db.run('DELETE FROM categories WHERE id = ?', [id]);

    return { ok: true };
  }
}
