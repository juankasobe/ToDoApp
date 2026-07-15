import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { CategoryService } from '../../categories/services/category.service';
import { CATEGORY_ERROR_CODE } from '../../categories/models/category-error';
import { TaskService } from '../services/task.service';
import { TaskCreatePage } from './task-create.page';

describe('TaskCreatePage', () => {
  let taskService: jasmine.SpyObj<TaskService>;
  let categoryService: jasmine.SpyObj<CategoryService>;
  let router: jasmine.SpyObj<Router>;
  let paramMap: Map<string, string>;
  let page: TaskCreatePage;

  beforeEach(() => {
    taskService = jasmine.createSpyObj<TaskService>('TaskService', ['create', 'getById', 'update']);
    categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['list']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    paramMap = new Map();
    categoryService.list.and.resolveTo([
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskCreatePage,
        { provide: TaskService, useValue: taskService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
    });
    page = TestBed.inject(TaskCreatePage);
  });

  it('loads existing categories for task assignment', async () => {
    page.title = 'Stale edit title';
    page.categoryId = 'health';
    page.errorMessage = 'Previous error';

    await page.ionViewWillEnter();

    expect(page.categories).toEqual([
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);
    expect(page.title).toBe('');
    expect(page.categoryId).toBeNull();
    expect(page.errorMessage).toBe('');
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

  it('prefills edit mode without changing the task before save', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    await page.ionViewWillEnter();

    expect(page.isEditMode).toBeTrue();
    expect(page.pageTitle).toBe('Edit Task');
    expect(page.saveButtonLabel).toBe('Save Changes');
    expect(page.title).toBe('Buy milk');
    expect(page.categoryId).toBe('health');
    expect(taskService.update).not.toHaveBeenCalled();
    expect(taskService.create).not.toHaveBeenCalled();
  });

  it('updates the current task and returns to all tasks from edit mode', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
    });
    taskService.update.and.resolveTo({
      id: 'task-1',
      title: 'Buy oat milk',
      completed: true,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    await page.ionViewWillEnter();
    page.title = 'Buy oat milk';
    page.categoryId = null;
    await page.save();

    expect(taskService.update).toHaveBeenCalledWith({ id: 'task-1', title: 'Buy oat milk', categoryId: null });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
  });

  it('shows safe feedback when an edit task cannot be loaded', async () => {
    paramMap.set('taskId', 'missing-task');
    taskService.getById.and.rejectWith(new Error('task-not-found'));

    await page.ionViewWillEnter();

    expect(page.errorMessage).toBe('Task not found. Return to the task list and try again.');
    expect(page.title).toBe('');
  });

  it('shows safe feedback when the selected edit category no longer exists', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1',
      title: 'Plan workout',
      completed: false,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
    });
    taskService.update.and.rejectWith(new Error(CATEGORY_ERROR_CODE.NOT_FOUND));

    await page.ionViewWillEnter();
    await page.save();

    expect(page.errorMessage).toBe('Choose an existing category or leave the task uncategorized.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('resets stale edit state before loading categories when entering create mode', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    await page.ionViewWillEnter();
    page.errorMessage = 'Previous edit error';
    paramMap.delete('taskId');
    await page.ionViewWillEnter();

    expect(page.isEditMode).toBeFalse();
    expect(page.pageTitle).toBe('New Task');
    expect(page.saveButtonLabel).toBe('Save Task');
    expect(page.title).toBe('');
    expect(page.categoryId).toBeNull();
    expect(page.errorMessage).toBe('');
  });
});
