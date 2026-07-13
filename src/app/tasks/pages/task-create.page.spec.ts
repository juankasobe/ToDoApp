import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { CategoryService } from '../../categories/services/category.service';
import { TaskService } from '../services/task.service';
import { TaskCreatePage } from './task-create.page';

describe('TaskCreatePage', () => {
  let taskService: jasmine.SpyObj<TaskService>;
  let categoryService: jasmine.SpyObj<CategoryService>;
  let router: jasmine.SpyObj<Router>;
  let page: TaskCreatePage;

  beforeEach(() => {
    taskService = jasmine.createSpyObj<TaskService>('TaskService', ['create']);
    categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['list']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    categoryService.list.and.resolveTo([
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskCreatePage,
        { provide: TaskService, useValue: taskService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Router, useValue: router },
      ],
    });
    page = TestBed.inject(TaskCreatePage);
  });

  it('loads existing categories for task assignment', async () => {
    await page.ionViewWillEnter();

    expect(page.categories).toEqual([
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);
  });

  it('creates a task with the selected category and returns to all tasks', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1',
      title: 'Plan workout',
      completed: false,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
    });
    page.title = '  Plan workout  ';
    page.categoryId = 'health';

    await page.save();

    expect(taskService.create).toHaveBeenCalledWith({ title: '  Plan workout  ', categoryId: 'health' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
  });

  it('shows feedback when the title is empty and does not create a task', async () => {
    taskService.create.and.rejectWith(new Error('empty-title'));
    page.title = '   ';
    page.categoryId = null;

    await page.save();

    expect(page.errorMessage).toBe('Enter a task title.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
