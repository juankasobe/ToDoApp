import { Category } from '../../categories/models/category.model';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';

export type CreateCategoryInput = {
  name: string;
};

export type UpdateCategoryInput = {
  name: string;
};

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; reason: typeof CATEGORY_ERROR_CODE.NOT_EMPTY };

export abstract class CategoryRepository {
  abstract list(): Promise<Category[]>;
  abstract create(input: CreateCategoryInput): Promise<Category>;
  abstract getById(id: string): Promise<Category>;
  abstract update(id: string, input: UpdateCategoryInput): Promise<Category>;
  abstract delete(id: string): Promise<DeleteCategoryResult>;
}
