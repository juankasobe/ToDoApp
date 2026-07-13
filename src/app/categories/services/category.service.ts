import { Injectable, inject } from '@angular/core';

import { Category } from '../models/category.model';
import { CategoryRepository } from '../../core/data-access/category.repository';
import { TaskFilter } from '../../tasks/services/task.service';

export type CreateCategoryCommand = {
  name: string;
};

export type MenuFilter = {
  label: string;
  filter: TaskFilter;
};

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly repository = inject(CategoryRepository);

  list(): Promise<Category[]> {
    return this.repository.list();
  }

  async create(command: CreateCategoryCommand): Promise<Category> {
    const name = command.name.trim();

    if (!name) {
      throw new Error('empty-name');
    }

    return this.repository.create({ name });
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.delete(id);

    if (!result.ok) {
      throw new Error(result.reason);
    }
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
}
