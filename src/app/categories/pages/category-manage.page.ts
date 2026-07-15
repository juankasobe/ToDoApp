import { Component, inject } from '@angular/core';

import { Category } from '../models/category.model';
import { CATEGORY_ERROR_CODE, CategoryErrorCode } from '../models/category-error';
import { CategoryService } from '../services/category.service';

const CATEGORY_LOAD_ERROR = 'Categories could not be loaded. Try again.';
const CATEGORY_RELOAD_AFTER_SAVE_ERROR = 'Category saved, but the list could not refresh. Try again.';
const CATEGORY_ERROR_MESSAGES: Record<CategoryErrorCode, string> = {
  [CATEGORY_ERROR_CODE.EMPTY_NAME]: 'Enter a category name.',
  [CATEGORY_ERROR_CODE.NOT_EMPTY]: 'Move or delete tasks in this category before deleting it.',
  [CATEGORY_ERROR_CODE.DUPLICATE_NAME]: 'A category with this name already exists.',
  [CATEGORY_ERROR_CODE.NOT_FOUND]: 'This category no longer exists.',
};

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
  canRetryCategoryLoad = false;
  editingCategoryId: string | null = null;
  editingName = '';

  private readonly categoryService = inject(CategoryService);
  private retryCategoryLoadErrorMessage = CATEGORY_LOAD_ERROR;

  async ionViewWillEnter(): Promise<void> {
    this.resetEditing();
    await this.reloadCategories(CATEGORY_LOAD_ERROR);
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

  startEditing(category: Category): void {
    this.errorMessage = '';
    this.editingCategoryId = category.id;
    this.editingName = category.name;
  }

  cancelEditing(): void {
    this.resetEditing();
  }

  async saveEditing(): Promise<void> {
    if (!this.editingCategoryId) {
      return;
    }

    this.errorMessage = '';

    try {
      await this.categoryService.rename(this.editingCategoryId, { name: this.editingName });
      this.resetEditing();
      await this.reloadCategories(CATEGORY_RELOAD_AFTER_SAVE_ERROR);
    } catch (error) {
      console.error('Category rename failed.', error);
      this.errorMessage = this.toErrorMessage(error);
    }
  }

  async retryCategoryLoad(): Promise<void> {
    await this.reloadCategories(this.retryCategoryLoadErrorMessage);
  }

  private async loadCategories(): Promise<void> {
    this.categories = await this.categoryService.list();
  }

  private async reloadCategories(errorMessage: string): Promise<void> {
    this.errorMessage = '';
    this.canRetryCategoryLoad = false;
    this.retryCategoryLoadErrorMessage = errorMessage;

    try {
      await this.loadCategories();
    } catch (error) {
      console.error('Category list load failed.', error);
      this.errorMessage = errorMessage;
      this.canRetryCategoryLoad = true;
    }
  }

  private resetEditing(): void {
    this.editingCategoryId = null;
    this.editingName = '';
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && this.isCategoryErrorCode(error.message)) {
      return CATEGORY_ERROR_MESSAGES[error.message];
    }

    return 'The category could not be saved.';
  }

  private isCategoryErrorCode(value: string): value is CategoryErrorCode {
    return Object.values(CATEGORY_ERROR_CODE).includes(value as CategoryErrorCode);
  }
}
