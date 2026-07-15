import { Injectable, inject } from '@angular/core';

import { DEFAULT_TASK_PRIORITY, isTaskPriority, Task, TaskPriority } from '../models/task.model';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';
import { TaskListFilter, TaskRepository } from '../../core/data-access/task.repository';

export type TaskFilter =
  | { kind: 'all' }
  | { kind: 'uncategorized' }
  | { kind: 'category'; categoryId: string };

export type CreateTaskCommand = {
  title: string;
  categoryId: string | null;
  priority?: TaskPriority;
};

export type UpdateTaskCommand = {
  id: string;
  title: string;
  categoryId: string | null;
  priority?: TaskPriority;
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
      return await this.repository.create({ title, categoryId: command.categoryId, priority: this.resolvePriority(command.priority) });
    } catch (error) {
      if (error instanceof Error && error.message === CATEGORY_ERROR_CODE.NOT_FOUND) {
        throw new Error(CATEGORY_ERROR_CODE.NOT_FOUND);
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
      return await this.repository.update(command.id, {
        title,
        categoryId: command.categoryId,
        priority: await this.resolveUpdatePriority(command.id, command.priority),
      });
    } catch (error) {
      if (error instanceof Error && (error.message === CATEGORY_ERROR_CODE.NOT_FOUND || error.message === 'task-not-found')) {
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

  private resolvePriority(priority: unknown): TaskPriority {
    if (priority === undefined) {
      return DEFAULT_TASK_PRIORITY;
    }

    if (!isTaskPriority(priority)) {
      throw new Error('invalid-priority');
    }

    return priority;
  }

  private async resolveUpdatePriority(id: string, priority: unknown): Promise<TaskPriority> {
    if (priority === undefined) {
      return (await this.repository.getById(id)).priority;
    }

    return this.resolvePriority(priority);
  }
}
