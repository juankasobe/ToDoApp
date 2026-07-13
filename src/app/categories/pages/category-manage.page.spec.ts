import { TestBed } from '@angular/core/testing';

import { CategoryService } from '../services/category.service';
import { CategoryManagePage } from './category-manage.page';

describe('CategoryManagePage', () => {
  let service: jasmine.SpyObj<CategoryService>;
  let page: CategoryManagePage;

  beforeEach(() => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['list', 'create', 'delete']);
    service.list.and.resolveTo([
      { id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      providers: [CategoryManagePage, { provide: CategoryService, useValue: service }],
    });
    page = TestBed.inject(CategoryManagePage);
  });

  it('loads categories for management', async () => {
    await page.ionViewWillEnter();

    expect(page.categories).toEqual([
      { id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);
  });

  it('creates a non-empty category and refreshes the category list', async () => {
    service.create.and.resolveTo({ id: 'health', name: 'Health', createdAt: '2026-07-09T21:00:00.000Z' });
    page.name = '  Health  ';

    await page.createCategory();

    expect(service.create).toHaveBeenCalledWith({ name: '  Health  ' });
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(page.name).toBe('');
  });

  it('shows feedback for empty category names without refreshing', async () => {
    service.create.and.rejectWith(new Error('empty-name'));
    page.name = '   ';

    await page.createCategory();

    expect(page.errorMessage).toBe('Enter a category name.');
    expect(service.list).not.toHaveBeenCalled();
  });

  it('shows blocked-delete feedback and leaves categories visible', async () => {
    service.delete.and.rejectWith(new Error('category-not-empty'));
    await page.ionViewWillEnter();
    service.list.calls.reset();

    await page.deleteCategory('home');

    expect(page.errorMessage).toBe('Move or delete tasks in this category before deleting it.');
    expect(service.list).not.toHaveBeenCalled();
    expect(page.categories[0].name).toBe('Home');
  });
});
