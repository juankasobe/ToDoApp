import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Category } from '../../categories/models/category.model';
import { CategoryService } from '../../categories/services/category.service';
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

  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  async ionViewWillEnter(): Promise<void> {
    this.categories = await this.categoryService.list();
  }

  async save(): Promise<void> {
    this.errorMessage = '';

    try {
      await this.taskService.create({ title: this.title, categoryId: this.categoryId });
      this.title = '';
      this.categoryId = null;
      await this.router.navigateByUrl('/tasks');
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message === 'empty-title') {
      return 'Enter a task title.';
    }

    if (error instanceof Error && error.message === 'category-not-found') {
      return 'Choose an existing category or leave the task uncategorized.';
    }

    return 'The task could not be saved.';
  }
}
