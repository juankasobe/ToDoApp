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

  it('renders a named form with labeled title, category, due-date, feedback, and action regions', async () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form[aria-label="Task details"]');
    expect(form).not.toBeNull();
    expect(form.querySelector('fieldset[aria-label="Title"] ion-input[placeholder="Task title"]')).not.toBeNull();
    expect(form.querySelector('fieldset[aria-label="Category and priority"] ion-select')).not.toBeNull();
    expect(form.querySelector('fieldset[aria-label="Due date"] #due-date-input')).not.toBeNull();
    expect(form.querySelector('[role="group"][aria-label="Form feedback"]')).not.toBeNull();
    expect(form.querySelector('[role="group"][aria-label="Form actions"] ion-button[expand="block"]')).not.toBeNull();
  });

  it('keeps real moon and cloud decoration inert while retaining the form controls', async () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const decoration = fixture.nativeElement.querySelector('.task-form-decoration[aria-hidden="true"]');
    const form = fixture.nativeElement.querySelector('form[aria-label="Task details"]');
    const focusableDecorationElements = decoration.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    expect(decoration.querySelector('.task-form-moon')).not.toBeNull();
    expect(decoration.querySelectorAll('.task-form-cloud').length).toBe(2);
    expect(focusableDecorationElements.length).toBe(0);
    expect(form.querySelector('fieldset[aria-label="Title"] ion-input[placeholder="Task title"]')).not.toBeNull();
    expect(form.querySelector('fieldset[aria-label="Category and priority"] #priority-select')).not.toBeNull();
    expect(form.querySelector('fieldset[aria-label="Due date"] #due-date-input')).not.toBeNull();
  });

  it('keeps decoration hidden and the edit save action reachable in edit mode', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1', title: 'Buy milk', completed: false, categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'medium', dueDate: null,
    });
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const decoration = fixture.nativeElement.querySelector('.task-form-decoration[aria-hidden="true"]');
    const form = fixture.nativeElement.querySelector('form[aria-label="Task details"]');

    expect(decoration.querySelectorAll('.task-form-moon, .task-form-cloud').length).toBe(3);
    expect(decoration.querySelectorAll('button, [tabindex]:not([tabindex="-1"])').length).toBe(0);
    expect(form.querySelector('[role="group"][aria-label="Form actions"] ion-button').textContent)
      .toContain('Save Changes');
  });

  it('keeps form hooks and announces unchanged error and retry feedback', async () => {
    categoryService.list.and.rejectWith(new Error('category-load-failed'));
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form[aria-label="Task details"]');
    const feedback = form.querySelector('[role="group"][aria-label="Form feedback"]');
    const alert = feedback.querySelector('[role="alert"][aria-live="assertive"]');
    expect(form.querySelector('ion-input[placeholder="Task title"]')).not.toBeNull();
    expect(form.querySelector('ion-select:not(#priority-select)')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#priority-select')).not.toBeNull();
    expect(form.querySelector('#due-date-input[type="date"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Clear due date');
    expect(alert.textContent).toContain('Categories could not be loaded. Try again.');
    expect(fixture.nativeElement.textContent).toContain('Retry');
    expect(form.querySelector('ion-button[expand="block"]')?.textContent).toContain('Save Task');
    expect(fixture.nativeElement.querySelector('ion-back-button[defaultHref="/tasks"]')).not.toBeNull();
  });

  it('announces a save validation error, then lets the user correct it and save from the rendered form', async () => {
    taskService.create.and.returnValues(
      Promise.reject(new Error('empty-title')),
      Promise.resolve({
        id: 'task-1', title: 'Plan workout', completed: false, categoryId: null,
        createdAt: '2026-07-09T20:00:00.000Z', priority: 'medium', dueDate: null,
      }),
    );
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form[aria-label="Task details"]');
    const titleInput = form.querySelector('ion-input[placeholder="Task title"]');
    const saveButton = form.querySelector('[role="group"][aria-label="Form actions"] ion-button');
    saveButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(form.querySelector('[role="alert"]')?.textContent).toContain('Enter a task title.');
    expect(fixture.nativeElement.querySelector('ion-back-button[defaultHref="/tasks"]')).not.toBeNull();

    titleInput.value = 'Plan workout';
    titleInput.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.detectChanges();
    saveButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(taskService.create).toHaveBeenCalledWith({
      title: 'Plan workout', categoryId: null, priority: 'medium', dueDate: null,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
    expect(form.querySelector('[role="alert"]')).toBeNull();
  });

  it('creates a task with the selected category and returns to all tasks', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1',
      title: 'Plan workout',
      completed: false,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'medium',
      dueDate: null,
    });
    page.title = '  Plan workout  ';
    page.categoryId = 'health';

    await page.save();

    expect(taskService.create).toHaveBeenCalledWith({
      title: '  Plan workout  ',
      categoryId: 'health',
      priority: 'medium',
      dueDate: null,
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
      dueDate: null,
    });
    page.title = 'Plan workout';
    page.priority = 'high';

    await page.save();

    expect(taskService.create).toHaveBeenCalledWith({
      title: 'Plan workout',
      categoryId: null,
      priority: 'high',
      dueDate: null,
    });
  });

  it('renders a clearable due-date input, saves the selected date, and resets it after create success', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1', title: 'Plan workout', completed: false, categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'medium', dueDate: '2026-07-15',
    });
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dueDateInput = fixture.nativeElement.querySelector('#due-date-input');
    expect(component.dueDate).toBeNull();

    fixture.nativeElement.querySelector('ion-input[placeholder="Task title"]').value = 'Plan workout';
    fixture.nativeElement.querySelector('ion-input[placeholder="Task title"]').dispatchEvent(
      new CustomEvent('ionInput', { bubbles: true }),
    );
    dueDateInput.value = '2026-07-15';
    dueDateInput.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button[expand="block"]').click();
    await fixture.whenStable();

    expect(taskService.create).toHaveBeenCalledWith({
      title: 'Plan workout',
      categoryId: null,
      priority: 'medium',
      dueDate: '2026-07-15',
    });
    expect(component.dueDate).toBeNull();
  });

  it('renders canonical priority options, defaults to medium, and saves a selected priority', async () => {
    taskService.create.and.resolveTo({
      id: 'task-1', title: 'Plan workout', completed: false, categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'high', dueDate: null,
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

    expect(taskService.create).toHaveBeenCalledWith({ title: 'Plan workout', categoryId: null, priority: 'high', dueDate: null });
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
      dueDate: null,
    });

    await page.ionViewWillEnter();

    expect(page.isEditMode).toBeTrue();
    expect(page.pageTitle).toBe('Edit Task');
    expect(page.saveButtonLabel).toBe('Save Changes');
    expect(page.title).toBe('Buy milk');
    expect(page.categoryId).toBe('health');
    expect(page.priority).toBe('medium');
    expect(page.dueDate).toBeNull();
    expect(taskService.update).not.toHaveBeenCalled();
    expect(taskService.create).not.toHaveBeenCalled();
  });

  it('renders the existing due date in edit mode and preserves it on save until the user clears it', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1', title: 'Buy milk', completed: false, categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'high', dueDate: '2026-07-15',
    });
    taskService.update.and.resolveTo({} as never);
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dueDateInput = fixture.nativeElement.querySelector('#due-date-input');
    expect(component.dueDate).toBe('2026-07-15');
    expect(dueDateInput.value).toBe('2026-07-15');

    fixture.nativeElement.querySelector('ion-button[expand="block"]').click();
    await fixture.whenStable();

    expect(taskService.update).toHaveBeenCalledWith({
      id: 'task-1',
      title: 'Buy milk',
      categoryId: 'health',
      priority: 'high',
      dueDate: '2026-07-15',
    });
  });

  it('clears the selected due date from the edit form and saves null', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1', title: 'Buy milk', completed: false, categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'medium', dueDate: '2026-07-15',
    });
    taskService.update.and.resolveTo({} as never);
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('ion-button[fill="clear"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button[expand="block"]').click();
    await fixture.whenStable();

    expect(component.dueDate).toBeNull();
    expect(taskService.update).toHaveBeenCalledWith({
      id: 'task-1',
      title: 'Buy milk',
      categoryId: 'health',
      priority: 'medium',
      dueDate: null,
    });
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
      dueDate: null,
    });
    taskService.update.and.resolveTo({
      id: 'task-1',
      title: 'Buy oat milk',
      completed: true,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'medium',
      dueDate: null,
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
      dueDate: null,
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
      dueDate: null,
    });
    taskService.update.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'low',
      dueDate: null,
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
      dueDate: null,
    });
  });

  it('renders an edit priority prefill and preserves the selected binding on save', async () => {
    paramMap.set('taskId', 'task-1');
    taskService.getById.and.resolveTo({
      id: 'task-1', title: 'Buy milk', completed: false, categoryId: 'health',
      createdAt: '2026-07-09T20:00:00.000Z', priority: 'high', dueDate: null,
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
      id: 'task-1', title: 'Buy milk', categoryId: 'health', priority: 'high', dueDate: null,
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
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Categories could not be loaded. Try again.');
    expect(component.title).toBe('');
    expect(component.categoryId).toBeNull();
    expect(component.priority).toBe('medium');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Task category list load failed.', jasmine.any(Error));

    fixture.nativeElement.querySelector('ion-button[aria-label="Retry category loading"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.categories).toEqual([{ id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' }]);
    expect(component.errorMessage).toBe('');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-button[aria-label="Retry category loading"]')).toBeNull();
    expect(Array.from<Element>(fixture.nativeElement.querySelectorAll('ion-select-option'))
      .map((option) => option.textContent?.trim())).toContain('Health');
  });

  it('shows a safe message when priority validation rejects a save', async () => {
    taskService.create.and.rejectWith(new Error('invalid-priority'));
    page.title = 'Plan workout';
    page.priority = 'high';

    await page.save();

    expect(page.errorMessage).toBe('The task could not be saved.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('renders the due-date validation message when save fails with invalid-due-date', async () => {
    taskService.create.and.rejectWith(new Error('invalid-due-date'));
    const fixture = TestBed.createComponent(TaskCreatePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const titleInput = fixture.nativeElement.querySelector('ion-input[placeholder="Task title"]');
    titleInput.value = 'Plan workout';
    titleInput.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('ion-button[expand="block"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Enter a valid due date.');
    expect(fixture.nativeElement.textContent).toContain('Enter a valid due date.');
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
      dueDate: null,
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
      dueDate: null,
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
