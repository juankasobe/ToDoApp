import { Component, inject } from '@angular/core';

import { Category } from '../models/category.model';
import { CategoryService } from '../services/category.service';

@Component({
  selector: 'app-category-manage',
  templateUrl: './category-manage.page.html',
  styleUrls: ['./category-manage.page.scss'],
  standalone: false,
})
export class CategoryManagePage {
  categories: Category[] = [];
  name = '';
  errorMessage = '';

  private readonly categoryService = inject(CategoryService);

  async ionViewWillEnter(): Promise<void> {
    await this.loadCategories();
  }

  async createCategory(): Promise<void> {
    this.errorMessage = '';

    try {
      await this.categoryService.create({ name: this.name });
      this.name = '';
      await this.loadCategories();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    this.errorMessage = '';

    try {
      await this.categoryService.delete(id);
      await this.loadCategories();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  private async loadCategories(): Promise<void> {
    this.categories = await this.categoryService.list();
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message === 'empty-name') {
      return 'Enter a category name.';
    }

    if (error instanceof Error && error.message === 'category-not-empty') {
      return 'Move or delete tasks in this category before deleting it.';
    }

    return 'The category could not be saved.';
  }
}
