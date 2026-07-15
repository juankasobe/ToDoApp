import { TestBed } from '@angular/core/testing';

import { CategoryRepository } from '../../core/data-access/category.repository';
import { CATEGORY_ERROR_CODE } from '../models/category-error';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let repository: jasmine.SpyObj<CategoryRepository>;
  let service: CategoryService;

  beforeEach(() => {
    repository = jasmine.createSpyObj<CategoryRepository>('CategoryRepository', ['list', 'create', 'getById', 'update', 'delete']);
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
    await expectAsync(service.create({ name: '   ' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.EMPTY_NAME);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('trims valid rename commands before persisting only the replacement name', async () => {
    repository.update.and.resolveTo({ id: 'category-1', name: 'Projects', createdAt: '2026-07-14T00:00:00.000Z' });

    const category = await service.rename('category-1', { name: '  Projects  ' });

    expect(category).toEqual({ id: 'category-1', name: 'Projects', createdAt: '2026-07-14T00:00:00.000Z' });
    expect(repository.update).toHaveBeenCalledWith('category-1', { name: 'Projects' });
  });

  it('allows renaming a category to its own normalized name', async () => {
    repository.update.and.resolveTo({ id: 'category-1', name: 'Projects', createdAt: '2026-07-14T00:00:00.000Z' });

    await expectAsync(service.rename('category-1', { name: '  Projects  ' })).toBeResolvedTo(
      { id: 'category-1', name: 'Projects', createdAt: '2026-07-14T00:00:00.000Z' },
    );

    expect(repository.update).toHaveBeenCalledWith('category-1', { name: 'Projects' });
  });

  it('notifies listeners after a category rename persists', async () => {
    repository.update.and.resolveTo({ id: 'category-1', name: 'Projects', createdAt: '2026-07-14T00:00:00.000Z' });
    const listener = jasmine.createSpy('listener');
    const subscription = service.categoryChanges$.subscribe(listener);

    await service.rename('category-1', { name: 'Projects' });

    expect(listener).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('rejects whitespace-only rename commands before calling the repository', async () => {
    await expectAsync(service.rename('category-1', { name: '   ' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.EMPTY_NAME);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('preserves duplicate and missing category errors from persistence for create and rename', async () => {
    repository.create.and.rejectWith(new Error(CATEGORY_ERROR_CODE.DUPLICATE_NAME));
    repository.update.and.rejectWith(new Error(CATEGORY_ERROR_CODE.NOT_FOUND));

    await expectAsync(service.create({ name: 'Work' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.DUPLICATE_NAME);
    await expectAsync(service.rename('missing', { name: 'Projects' })).toBeRejectedWithError(CATEGORY_ERROR_CODE.NOT_FOUND);

    expect(repository.create).toHaveBeenCalledWith({ name: 'Work' });
    expect(repository.update).toHaveBeenCalledWith('missing', { name: 'Projects' });
  });

  it('maps category deletion guards to domain errors', async () => {
    repository.delete.and.resolveTo({ ok: false, reason: CATEGORY_ERROR_CODE.NOT_EMPTY });

    await expectAsync(service.delete('category-1')).toBeRejectedWithError(CATEGORY_ERROR_CODE.NOT_EMPTY);
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
