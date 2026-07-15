import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Category } from '../../categories/models/category.model';
import { CategoryService } from '../../categories/services/category.service';
import { Task } from '../models/task.model';
import { TaskFilter, TaskService } from '../services/task.service';

type RouteFilterKind = 'all' | 'uncategorized' | 'category';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.page.html',
  styleUrls: ['./task-list.page.scss'],
  standalone: false,
})
export class TaskListPage {
  tasks: Task[] = [];
  categories: Category[] = [];
  pageTitle = 'All Tasks';
  errorMessage = '';

  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);

  async ionViewWillEnter(): Promise<void> {
    await this.loadTasks();
  }

  async toggleTask(task: Task): Promise<void> {
    this.errorMessage = '';

    try {
      await this.taskService.setCompleted(task.id, !task.completed);
      await this.loadTasks();
    } catch {
      this.errorMessage = 'Task could not be updated. Try again.';
    }
  }

  async deleteTask(task: Task): Promise<void> {
    this.errorMessage = '';

    try {
      await this.taskService.delete(task.id);
      await this.loadTasks();
    } catch {
      this.errorMessage = 'Task could not be deleted. Try again.';
    }
  }

  async loadTasks(): Promise<void> {
    const filter = this.resolveFilter();
    this.errorMessage = '';

    try {
      const [tasks, categories] = await Promise.all([
        this.taskService.list(filter),
        this.categoryService.list(),
      ]);

      this.tasks = tasks;
      this.categories = categories;
      this.pageTitle = this.resolveTitle(filter);
    } catch {
      this.errorMessage = 'Tasks could not be loaded. Try again.';
    }
  }

  getCategoryName(categoryId: string): string {
    return this.categories.find((category) => category.id === categoryId)?.name ?? 'Unknown category';
  }

  getTaskEditLink(task: Task): string {
    return `/tasks/${task.id}/edit`;
  }

  getPriorityLabel(task: Task): string {
    return `Priority: ${task.priority}`;
  }

  private resolveFilter(): TaskFilter {
    const filterKind = this.route.snapshot.data['filterKind'] as RouteFilterKind | undefined;

    if (filterKind === 'uncategorized') {
      return { kind: 'uncategorized' };
    }

    if (filterKind === 'category') {
      return { kind: 'category', categoryId: this.route.snapshot.paramMap.get('categoryId') ?? '' };
    }

    return { kind: 'all' };
  }

  private resolveTitle(filter: TaskFilter): string {
    if (filter.kind === 'uncategorized') {
      return 'Uncategorized';
    }

    if (filter.kind === 'category') {
      return this.getCategoryName(filter.categoryId);
    }

    return 'All Tasks';
  }
}
