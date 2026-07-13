import { TestBed } from '@angular/core/testing';

import { CategoryRepository } from '../../core/data-access/category.repository';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let repository: jasmine.SpyObj<CategoryRepository>;
  let service: CategoryService;

  beforeEach(() => {
    repository = jasmine.createSpyObj<CategoryRepository>('CategoryRepository', ['list', 'create', 'delete']);
    TestBed.configureTestingModule({
      providers: [CategoryService, { provide: CategoryRepository, useValue: repository }],
    });
    service = TestBed.inject(CategoryService);
  });

  it('trims valid names and creates categories', async () => {
    repository.create.and.resolveTo({ id: 'category-1', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' });

    const category = await service.create({ name: '  Home  ' });

    expect(category.name).toBe('Home');
    expect(repository.create).toHaveBeenCalledWith({ name: 'Home' });
  });

  it('rejects whitespace-only category names before calling the repository', async () => {
    await expectAsync(service.create({ name: '   ' })).toBeRejectedWithError('empty-name');

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('maps category deletion guards to domain errors', async () => {
    repository.delete.and.resolveTo({ ok: false, reason: 'category-not-empty' });

    await expectAsync(service.delete('category-1')).toBeRejectedWithError('category-not-empty');
  });

  it('allows deleting empty categories when the repository guard passes', async () => {
    repository.delete.and.resolveTo({ ok: true });

    await service.delete('category-1');

    expect(repository.delete).toHaveBeenCalledWith('category-1');
  });

  it('builds side-menu filters from all tasks, uncategorized, and user categories', async () => {
    repository.list.and.resolveTo([
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
      { id: 'home', name: 'Home', createdAt: '2026-07-09T21:00:00.000Z' },
    ]);

    const menuItems = await service.getMenuFilters();

    expect(menuItems).toEqual([
      { label: 'All Tasks', filter: { kind: 'all' } },
      { label: 'Uncategorized', filter: { kind: 'uncategorized' } },
      { label: 'Health', filter: { kind: 'category', categoryId: 'health' } },
      { label: 'Home', filter: { kind: 'category', categoryId: 'home' } },
    ]);
  });
});
