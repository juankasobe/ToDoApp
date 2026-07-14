import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../categories/models/category.model';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';
import { CategoryService } from '../../categories/services/category.service';
import { Task } from '../models/task.model';
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
  categories: Category[] = [];
  errorMessage = '';
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
      this.categories = await this.categoryService.list();
      return;
    }

    this.editTaskId = taskId;
    this.currentTask = null;
    this.errorMessage = '';
    this.categories = await this.categoryService.list();

    try {
      this.currentTask = await this.taskService.getById(taskId);
      this.title = this.currentTask.title;
      this.categoryId = this.currentTask.categoryId;
    } catch (error) {
      this.title = '';
      this.categoryId = null;
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  async save(): Promise<void> {
    this.errorMessage = '';

    try {
      if (this.editTaskId) {
        await this.taskService.update({ id: this.editTaskId, title: this.title, categoryId: this.categoryId });
      } else {
        await this.taskService.create({ title: this.title, categoryId: this.categoryId });
        this.title = '';
        this.categoryId = null;
      }

      await this.router.navigateByUrl('/tasks');
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  private resetCreateState(): void {
    this.title = '';
    this.categoryId = null;
    this.errorMessage = '';
    this.editTaskId = null;
    this.currentTask = null;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message === 'empty-title') {
      return 'Enter a task title.';
    }

    if (error instanceof Error && error.message === CATEGORY_ERROR_CODE.NOT_FOUND) {
      return 'Choose an existing category or leave the task uncategorized.';
    }

    if (error instanceof Error && error.message === 'task-not-found') {
      return 'Task not found. Return to the task list and try again.';
    }

    return 'The task could not be saved.';
  }
}
