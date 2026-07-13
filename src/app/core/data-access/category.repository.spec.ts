import { CategoryRepository } from './category.repository';

describe('CategoryRepository contract', () => {
  it('returns a category-not-empty result instead of deleting referenced categories', async () => {
    const repository: CategoryRepository = {
      list: jasmine.createSpy('list'),
      create: jasmine.createSpy('create'),
      delete: jasmine.createSpy('delete').and.resolveTo({ ok: false, reason: 'category-not-empty' }),
    };

    const result = await repository.delete('category-1');

    expect(result).toEqual({ ok: false, reason: 'category-not-empty' });
  });
});
