import { CategoryRepository } from './category.repository';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';

describe('CategoryRepository contract', () => {
  it('returns a not-empty result instead of deleting referenced categories', async () => {
    const repository: CategoryRepository = {
      list: jasmine.createSpy('list'),
      create: jasmine.createSpy('create'),
      getById: jasmine.createSpy('getById'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete').and.resolveTo({ ok: false, reason: CATEGORY_ERROR_CODE.NOT_EMPTY }),
    };

    const result = await repository.delete('category-1');

    expect(result).toEqual({ ok: false, reason: CATEGORY_ERROR_CODE.NOT_EMPTY });
  });

  it('retrieves and updates a category by its stable identifier', async () => {
    const category = { id: 'category-1', name: 'Projects', createdAt: '2026-07-14T00:00:00.000Z' };
    const repository: CategoryRepository = {
      list: jasmine.createSpy('list'),
      create: jasmine.createSpy('create'),
      getById: jasmine.createSpy('getById').and.resolveTo(category),
      update: jasmine.createSpy('update').and.resolveTo(category),
      delete: jasmine.createSpy('delete'),
    };

    const found = await repository.getById('category-1');
    const updated = await repository.update('category-1', { name: 'Projects' });

    expect(found).toEqual(category);
    expect(updated).toEqual(category);
    expect(repository.update).toHaveBeenCalledWith('category-1', { name: 'Projects' });
  });
});
