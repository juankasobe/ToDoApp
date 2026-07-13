import { Injectable, inject } from '@angular/core';

import { Task } from '../models/task.model';
import { TaskListFilter, TaskRepository } from '../../core/data-access/task.repository';

export type TaskFilter =
  | { kind: 'all' }
  | { kind: 'uncategorized' }
  | { kind: 'category'; categoryId: string };

export type CreateTaskCommand = {
  title: string;
  categoryId: string | null;
};

export type UpdateTaskCommand = {
  id: string;
  title: string;
  categoryId: string | null;
};

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly repository = inject(TaskRepository);

  async list(filter: TaskFilter = { kind: 'all' }): Promise<Task[]> {
    const repositoryFilter = this.toRepositoryFilter(filter);
    return repositoryFilter ? this.repository.list(repositoryFilter) : this.repository.list();
  }

  async create(command: CreateTaskCommand): Promise<Task> {
    const title = command.title.trim();

    if (!title) {
      throw new Error('empty-title');
    }

    try {
      return await this.repository.create({ title, categoryId: command.categoryId });
    } catch (error) {
      if (error instanceof Error && error.message === 'category-not-found') {
        throw new Error('category-not-found');
      }

      throw error;
    }
  }

  getById(id: string): Promise<Task> {
    return this.repository.getById(id);
  }

  async update(command: UpdateTaskCommand): Promise<Task> {
    const title = command.title.trim();

    if (!title) {
      throw new Error('empty-title');
    }

    try {
      return await this.repository.update(command.id, { title, categoryId: command.categoryId });
    } catch (error) {
      if (error instanceof Error && (error.message === 'category-not-found' || error.message === 'task-not-found')) {
        throw new Error(error.message);
      }

      throw error;
    }
  }

  setCompleted(id: string, completed: boolean): Promise<Task> {
    return this.repository.setCompleted(id, completed);
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  private toRepositoryFilter(filter: TaskFilter): TaskListFilter | undefined {
    if (filter.kind === 'all') {
      return undefined;
    }

    if (filter.kind === 'uncategorized') {
      return { categoryId: null };
    }

    return { categoryId: filter.categoryId };
  }
}
