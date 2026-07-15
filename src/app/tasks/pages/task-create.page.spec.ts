import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject } from 'rxjs';

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
    Object.defineProperty(router, 'events', { value: new Subject() });
    paramMap = new Map();
    categoryService.list.and.resolveTo([
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      declarations: [TaskCreatePage],
      imports: [FormsModule, IonicModule.forRoot()],
      providers: [
        TaskCreatePage,
        { provide: TaskService, useValue: taskService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap } } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
    expect(page.priority).toBe('medium');
    expect(page.errorMessage).toBe('');
  });

  it('creates a task with the selected category and returns to all tasks', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1',
      title: 'Plan workout',
      completed: false,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'medium',
    });
    page.title = '  Plan workout  ';
    page.categoryId = 'health';

    await page.save();

    expect(taskService.create).toHaveBeenCalledWith({
      title: '  Plan workout  ',
      categoryId: 'health',
      priority: 'medium',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
  });

  it('creates a task with the selected priority', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1',
      title: 'Plan workout',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'high',
    });
    page.title = 'Plan workout';
    page.priority = 'high';

    await page.save();

    expect(taskService.create).toHaveBeenCalledWith({
      title: 'Plan workout',
      categoryId: null,
      priority: 'high',
    });
  });

  it('renders canonical priority options, defaults to medium, and saves a selected priority', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1', title: 'Plan workout', completed: false, categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'high',
    });
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const prioritySelect = fixture.nativeElement.querySelector('#priority-select');
    expect(Array.from<Element>(fixture.nativeElement.querySelectorAll('ion-select-option')).slice(-3)
      .map((option: Element) => option.textContent?.trim())).toEqual(['low', 'medium', 'high']);
    expect(component.priority).toBe('medium');
    expect(prioritySelect.value).toBe('medium');

    fixture.nativeElement.querySelector('ion-input[placeholder="Task title"]').value = 'Plan workout';
    fixture.nativeElement.querySelector('ion-input[placeholder="Task title"]').dispatchEvent(
      new CustomEvent('ionInput', { bubbles: true }),
    );
    prioritySelect.value = 'high';
    prioritySelect.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, detail: { value: 'high' } }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button[expand="block"]').click();
    await fixture.whenStable();

    expect(taskService.create).toHaveBeenCalledWith({ title: 'Plan workout', categoryId: null, priority: 'high' });
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
      priority: 'medium',
    });

    await page.ionViewWillEnter();

    expect(page.isEditMode).toBeTrue();
    expect(page.pageTitle).toBe('Edit Task');
    expect(page.saveButtonLabel).toBe('Save Changes');
    expect(page.title).toBe('Buy milk');
    expect(page.categoryId).toBe('health');
    expect(page.priority).toBe('medium');
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
      priority: 'medium',
    });
    taskService.update.and.resolveTo({
      id: 'task-1',
      title: 'Buy oat milk',
      completed: true,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'medium',
    });

    await page.ionViewWillEnter();
    page.title = 'Buy oat milk';
    page.categoryId = null;
    await page.save();

    expect(taskService.update).toHaveBeenCalledWith({
      id: 'task-1',
      title: 'Buy oat milk',
      categoryId: null,
      priority: 'medium',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
  });

  it('preloads and saves the existing high priority in edit mode', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'high',
    });
    taskService.update.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'low',
    });

    await page.ionViewWillEnter();
    expect(page.priority).toBe('high');

    page.priority = 'low';
    await page.save();

    expect(taskService.update).toHaveBeenCalledWith({
      id: 'task-1',
      title: 'Buy milk',
      categoryId: 'health',
      priority: 'low',
    });
  });

  it('renders an edit priority prefill and preserves the selected binding on save', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1', title: 'Buy milk', completed: false, categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'high',
    });
    taskService.update.and.resolveTo({} as never);
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const prioritySelect = fixture.nativeElement.querySelector('#priority-select');
    expect(component.priority).toBe('high');
    expect(prioritySelect.value).toBe('high');
    fixture.nativeElement.querySelector('ion-button[expand="block"]').click();
    await fixture.whenStable();

    expect(taskService.update).toHaveBeenCalledWith({
      id: 'task-1', title: 'Buy milk', categoryId: 'health', priority: 'high',
    });
  });

  it('renders a category-load error, preserves a safe create form, and retries through the control', async () => {
    categoryService.list.and.returnValues(
      Promise.reject(new Error('category-load-failed')),
      Promise.resolve([{ id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' }]),
    );
    const consoleErrorSpy = spyOn(console, 'error');
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Categories could not be loaded. Try again.');
    expect(fixture.nativeElement.textContent).toContain('Retry');
    expect(component.title).toBe('');
    expect(component.categoryId).toBeNull();
    expect(component.priority).toBe('medium');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Task category list load failed.', jasmine.any(Error));

    fixture.nativeElement.querySelector('ion-button[aria-label="Retry category loading"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.categories).toEqual([{ id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' }]);
    expect(component.errorMessage).toBe('');
  });

  it('shows a safe message when priority validation rejects a save', async () => {
    taskService.create.and.rejectWith(new Error('invalid-priority'));
    page.title = 'Plan workout';
    page.priority = 'high';

    await page.save();

    expect(page.errorMessage).toBe('The task could not be saved.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
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
      priority: 'medium',
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
      priority: 'medium',
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
    expect(page.priority).toBe('medium');
    expect(page.errorMessage).toBe('');
  });
});
