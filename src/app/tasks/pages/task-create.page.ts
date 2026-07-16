import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../categories/models/category.model';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';
import { CategoryService } from '../../categories/services/category.service';
import { DEFAULT_TASK_PRIORITY, Task, TaskPriority, TASK_PRIORITIES } from '../models/task.model';
import { TaskService } from '../services/task.service';

@Component({
  selector: 'app-task-create',
  templateUrl: './task-create.page.html',
  styleUrls: ['./task-create.page.scss'],
  standalone: false,
})
export class TaskCreatePage {
  title = '';
  categoryId: string | null = null;
  priority: TaskPriority = DEFAULT_TASK_PRIORITY;
  dueDate: string | null = null;
  readonly taskPriorities = TASK_PRIORITIES;
  categories: Category[] = [];
  errorMessage = '';
  canRetryCategoryLoad = false;
  editTaskId: string | null = null;
  currentTask: Task | null = null;

  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  get isEditMode(): boolean {
    return this.editTaskId !== null;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Task' : 'New Task';
  }

  get saveButtonLabel(): string {
    return this.isEditMode ? 'Save Changes' : 'Save Task';
  }

  async ionViewWillEnter(): Promise<void> {
    const taskId = this.route.snapshot.paramMap.get('taskId');

    if (!taskId) {
      this.resetCreateState();
      await this.loadCategories();
      return;
    }

    this.editTaskId = taskId;
    this.currentTask = null;
    this.title = '';
    this.categoryId = null;
    this.priority = DEFAULT_TASK_PRIORITY;
    this.dueDate = null;
    this.errorMessage = '';
    if (!await this.loadCategories()) {
      return;
    }

    await this.loadTask(taskId);
  }

  async retryCategoryLoad(): Promise<void> {
    if (await this.loadCategories() && this.editTaskId) {
      await this.loadTask(this.editTaskId);
    }
  }

  private async loadTask(taskId: string): Promise<void> {
    try {
      this.currentTask = await this.taskService.getById(taskId);
      this.title = this.currentTask.title;
      this.categoryId = this.currentTask.categoryId;
      this.priority = this.currentTask.priority;
      this.dueDate = this.currentTask.dueDate;
    } catch (error) {
      this.title = '';
      this.categoryId = null;
      this.priority = DEFAULT_TASK_PRIORITY;
      this.dueDate = null;
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  clearDueDate(): void {
    this.dueDate = null;
  }

  async save(): Promise<void> {
    this.errorMessage = '';

    try {
      if (this.editTaskId) {
        await this.taskService.update({
          id: this.editTaskId,
          title: this.title,
          categoryId: this.categoryId,
          priority: this.priority,
          dueDate: this.dueDate,
        });
      } else {
        await this.taskService.create({
          title: this.title,
          categoryId: this.categoryId,
          priority: this.priority,
          dueDate: this.dueDate,
        });
        this.title = '';
        this.categoryId = null;
        this.priority = DEFAULT_TASK_PRIORITY;
        this.dueDate = null;
      }

      await this.router.navigateByUrl('/tasks');
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  private resetCreateState(): void {
    this.title = '';
    this.categoryId = null;
    this.priority = DEFAULT_TASK_PRIORITY;
    this.dueDate = null;
    this.errorMessage = '';
    this.canRetryCategoryLoad = false;
    this.editTaskId = null;
    this.currentTask = null;
  }

  private async loadCategories(): Promise<boolean> {
    this.errorMessage = '';
    this.canRetryCategoryLoad = false;

    try {
      this.categories = await this.categoryService.list();
      return true;
    } catch (error) {
      console.error('Task category list load failed.', error);
      this.errorMessage = 'Categories could not be loaded. Try again.';
      this.canRetryCategoryLoad = true;
      return false;
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message === 'empty-title') {
      return 'Enter a task title.';
    }

    if (error instanceof Error && error.message === CATEGORY_ERROR_CODE.NOT_FOUND) {
      return 'Choose an existing category or leave the task uncategorized.';
    }

    if (error instanceof Error && error.message === 'invalid-due-date') {
      return 'Enter a valid due date.';
    }

    if (error instanceof Error && error.message === 'task-not-found') {
      return 'Task not found. Return to the task list and try again.';
    }

    return 'The task could not be saved.';
  }
}
