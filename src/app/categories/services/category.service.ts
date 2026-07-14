import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';

import { Category } from '../models/category.model';
import { CATEGORY_ERROR_CODE } from '../models/category-error';
import { CategoryRepository } from '../../core/data-access/category.repository';
import { TaskFilter } from '../../tasks/services/task.service';

export type CreateCategoryCommand = {
  name: string;
};

export type RenameCategoryCommand = {
  name: string;
};

export type MenuFilter = {
  label: string;
  filter: TaskFilter;
};

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly repository = inject(CategoryRepository);
  private readonly categoryChanges = new Subject<void>();
  readonly categoryChanges$ = this.categoryChanges.asObservable();

  list(): Promise<Category[]> {
    return this.repository.list();
  }

  async create(command: CreateCategoryCommand): Promise<Category> {
    const category = await this.repository.create({ name: this.normalizeName(command.name) });
    this.categoryChanges.next();
    return category;
  }

  async rename(id: string, command: RenameCategoryCommand): Promise<Category> {
    const category = await this.repository.update(id, { name: this.normalizeName(command.name) });
    this.categoryChanges.next();
    return category;
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.delete(id);

    if (!result.ok) {
      throw new Error(result.reason);
    }

    this.categoryChanges.next();
  }

  async getMenuFilters(): Promise<MenuFilter[]> {
    const categories = await this.repository.list();

    return [
      { label: 'All Tasks', filter: { kind: 'all' } },
      { label: 'Uncategorized', filter: { kind: 'uncategorized' } },
      ...categories.map((category) => ({
        label: category.name,
        filter: { kind: 'category' as const, categoryId: category.id },
      })),
    ];
  }

  private normalizeName(value: string): string {
    const name = value.trim();

    if (!name) {
      throw new Error(CATEGORY_ERROR_CODE.EMPTY_NAME);
    }

    return name;
  }
}
