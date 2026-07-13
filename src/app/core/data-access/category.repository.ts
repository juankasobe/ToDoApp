import { Category } from '../../categories/models/category.model';

export type CreateCategoryInput = {
  name: string;
};

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; reason: 'category-not-empty' };

export abstract class CategoryRepository {
  abstract list(): Promise<Category[]>;
  abstract create(input: CreateCategoryInput): Promise<Category>;
  abstract delete(id: string): Promise<DeleteCategoryResult>;
}
