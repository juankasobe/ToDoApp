import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Category } from '../../categories/models/category.model';
import { CategoryService } from '../../categories/services/category.service';
import { Task } from '../models/task.model';
import { TaskFilter, TaskService } from '../services/task.service';

type RouteFilterKind = 'all' | 'uncategorized' | 'category';
export type DueDateFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none';

export interface ProgressSummary {
  total: number;
  completed: number;
  percentage: number;
  value: number;
}

export interface TaskListPresentation {
  displayedTasks: Task[];
  progressSummary: ProgressSummary;
  isAllTasksRoute: boolean;
  isFilteredEmptyState: boolean;
}

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
  dueDateFilter: DueDateFilter = 'all';

  readonly dueDateFilterOptions: ReadonlyArray<{ value: DueDateFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'none', label: 'No due date' },
  ];

  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);

  get displayedTasks(): Task[] {
    if (!this.isAllTasksRoute()) {
      return this.tasks;
    }

    const today = this.localToday();

    return this.tasks.filter((task) => {
      if (this.dueDateFilter === 'all') {
        return true;
      }

      if (this.dueDateFilter === 'none') {
        return task.dueDate === null;
      }

      if (task.dueDate === null) {
        return false;
      }

      if (this.dueDateFilter === 'overdue') {
        return !task.completed && task.dueDate < today;
      }

      if (this.dueDateFilter === 'today') {
        return task.dueDate === today;
      }

      return task.dueDate > today;
    });
  }

  get progressSummary(): ProgressSummary {
    return this.createProgressSummary(this.displayedTasks);
  }

  get presentationSnapshot(): TaskListPresentation {
    const displayedTasks = this.displayedTasks;

    return {
      displayedTasks,
      progressSummary: this.createProgressSummary(displayedTasks),
      isAllTasksRoute: this.isAllTasksRoute(),
      isFilteredEmptyState: this.tasks.length > 0 && displayedTasks.length === 0,
    };
  }

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

  getDueDateLabel(task: Task): string | null {
    return task.dueDate ? `Due: ${task.dueDate}` : null;
  }

  isTaskOverdue(task: Task): boolean {
    return task.dueDate !== null && !task.completed && task.dueDate < this.localToday();
  }

  isFilteredEmptyState(): boolean {
    return this.tasks.length > 0 && this.displayedTasks.length === 0;
  }

  isAllTasksRoute(): boolean {
    return this.resolveFilter().kind === 'all';
  }

  localToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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

  private createProgressSummary(displayedTasks: Task[]): ProgressSummary {
    const total = displayedTasks.length;
    const completed = displayedTasks.filter((task) => task.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, percentage, value: percentage / 100 };
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
