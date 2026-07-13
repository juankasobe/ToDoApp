import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { CategoryService } from '../../categories/services/category.service';
import { Task } from '../models/task.model';
import { TaskService } from '../services/task.service';
import { TaskListPage } from './task-list.page';

describe('TaskListPage', () => {
  let service: jasmine.SpyObj<TaskService>;
  let categoryService: jasmine.SpyObj<CategoryService>;

  function createPage(route: Partial<ActivatedRoute>): TaskListPage {
    service = jasmine.createSpyObj<TaskService>('TaskService', ['list', 'setCompleted', 'delete']);
    categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['list']);
    service.list.and.resolveTo([
      {
        id: 'task-1',
        title: 'Buy milk',
        completed: false,
        categoryId: 'home',
        createdAt: '2026-07-09T20:00:00.000Z',
      },
    ]);
    categoryService.list.and.resolveTo([
      { id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' },
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskListPage,
        { provide: TaskService, useValue: service },
        { provide: CategoryService, useValue: categoryService },
        { provide: ActivatedRoute, useValue: route },
      ],
    });

    return TestBed.inject(TaskListPage);
  }

  it('loads all tasks for the all-tasks route', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });

    await page.ionViewWillEnter();

    expect(service.list).toHaveBeenCalledWith({ kind: 'all' });
    expect(categoryService.list).toHaveBeenCalled();
    expect(page.tasks.length).toBe(1);
    expect(page.pageTitle).toBe('All Tasks');
    expect(page.getCategoryName('home')).toBe('Home');
  });

  it('loads category-scoped tasks from the selected route category id', async () => {
    const page = createPage({
      snapshot: {
        data: { filterKind: 'category' },
        paramMap: new Map([['categoryId', 'health']]),
      } as never,
    });

    await page.ionViewWillEnter();

    expect(service.list).toHaveBeenCalledWith({ kind: 'category', categoryId: 'health' });
    expect(page.pageTitle).toBe('Health');
  });

  it('falls back when a task references a missing category name', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });

    await page.ionViewWillEnter();

    expect(page.getCategoryName('missing')).toBe('Unknown category');
  });

  it('toggles completion and reloads visible tasks', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'uncategorized' }, paramMap: new Map() } as never });
    service.setCompleted.and.resolveTo({} as Task);

    await page.toggleTask({ id: 'task-1', completed: false } as Task);

    expect(service.setCompleted).toHaveBeenCalledWith('task-1', true);
    expect(service.list).toHaveBeenCalledWith({ kind: 'uncategorized' });
  });

  it('shows a retryable load error when tasks cannot be loaded', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.rejectWith(new Error('load-failed'));

    await page.ionViewWillEnter();

    expect(page.errorMessage).toBe('Tasks could not be loaded. Try again.');
    expect(page.tasks).toEqual([]);
  });

  it('shows a user-facing update error when toggling fails', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.setCompleted.and.rejectWith(new Error('update-failed'));

    await page.toggleTask({ id: 'task-1', completed: false } as Task);

    expect(page.errorMessage).toBe('Task could not be updated. Try again.');
  });

  it('deletes a task and reloads without deleting its category', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });

    await page.deleteTask({ id: 'task-1' } as Task);

    expect(service.delete).toHaveBeenCalledWith('task-1');
    expect(service.list).toHaveBeenCalledWith({ kind: 'all' });
  });

  it('shows a user-facing delete error when deletion fails', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.delete.and.rejectWith(new Error('delete-failed'));

    await page.deleteTask({ id: 'task-1' } as Task);

    expect(page.errorMessage).toBe('Task could not be deleted. Try again.');
  });
});
