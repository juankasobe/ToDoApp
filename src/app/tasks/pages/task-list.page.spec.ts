import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

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
        priority: 'medium',
        dueDate: null,
      },
    ]);
    categoryService.list.and.resolveTo([
      { id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' },
      { id: 'health', name: 'Health', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      declarations: [TaskListPage],
      imports: [IonicModule.forRoot()],
      providers: [
        TaskListPage,
        { provide: TaskService, useValue: service },
        { provide: CategoryService, useValue: categoryService },
        { provide: ActivatedRoute, useValue: route },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
    expect(page.getPriorityLabel(page.tasks[0])).toBe('Priority: medium');
  });

  it('retains the service newest-first order while exposing every priority label', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      {
        id: 'new-low', title: 'Newest', completed: false, categoryId: null,
        createdAt: '2026-07-10T20:00:00.000Z', priority: 'low', dueDate: null,
      },
      {
        id: 'old-high', title: 'Older', completed: false, categoryId: null,
        createdAt: '2026-07-09T20:00:00.000Z', priority: 'high', dueDate: null,
      },
    ]);

    await page.ionViewWillEnter();

    expect(page.tasks.map((task) => task.id)).toEqual(['new-low', 'old-high']);
    expect(page.tasks.map((task) => page.getPriorityLabel(task))).toEqual(['Priority: low', 'Priority: high']);
  });

  it('renders each task priority in the visible task list', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'low', title: 'Low', completed: false, categoryId: null, createdAt: '2026-07-10T20:00:00.000Z', priority: 'low', dueDate: null },
      { id: 'high', title: 'High', completed: false, categoryId: null, createdAt: '2026-07-09T20:00:00.000Z', priority: 'high', dueDate: null },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.componentInstance.tasks = page.tasks;
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Priority: low');
    expect(fixture.nativeElement.textContent).toContain('Priority: high');
  });

  it('defaults to the all due-date filter and renders one selector on the all route', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      {
        id: 'due-today', title: 'Due today', completed: false, categoryId: null,
        createdAt: '2026-07-10T20:00:00.000Z', priority: 'medium', dueDate: '2026-07-15',
      },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);
    const component = fixture.componentInstance;
    spyOn(component, 'localToday').and.returnValue('2026-07-15');

    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const filterSelect = fixture.nativeElement.querySelector('#due-date-filter');
    expect(component.dueDateFilter).toBe('all');
    expect(filterSelect).not.toBeNull();
    expect(Array.from<Element>(fixture.nativeElement.querySelectorAll('#due-date-filter ion-select-option'))
      .map((option: Element) => option.textContent?.trim()))
      .toEqual(['All', 'Overdue', 'Today', 'Upcoming', 'No due date']);
  });

  it('hides the due-date selector on scoped routes', async () => {
    createPage({
      snapshot: {
        data: { filterKind: 'category' },
        paramMap: new Map([['categoryId', 'home']]),
      } as never,
    });
    const categoryFixture = TestBed.createComponent(TaskListPage);
    const categoryComponent = categoryFixture.componentInstance;

    await categoryComponent.ionViewWillEnter();
    categoryFixture.detectChanges();

    expect(categoryComponent.dueDateFilter).toBe('all');
    expect(categoryFixture.nativeElement.querySelector('#due-date-filter')).toBeNull();
  });

  it('filters all-route tasks by the selected due-date predicate without changing newest-first order', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    spyOn(page, 'localToday').and.returnValue('2026-07-15');
    service.list.and.resolveTo([
      {
        id: 'none-newest', title: 'No due date', completed: false, categoryId: null,
        createdAt: '2026-07-15T12:00:00.000Z', priority: 'medium', dueDate: null,
      },
      {
        id: 'upcoming-completed', title: 'Upcoming complete', completed: true, categoryId: null,
        createdAt: '2026-07-14T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-16',
      },
      {
        id: 'today-completed', title: 'Today complete', completed: true, categoryId: null,
        createdAt: '2026-07-13T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-15',
      },
      {
        id: 'overdue-completed', title: 'Overdue complete', completed: true, categoryId: null,
        createdAt: '2026-07-12T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-14',
      },
      {
        id: 'overdue-newest', title: 'Newest overdue', completed: false, categoryId: null,
        createdAt: '2026-07-11T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-14',
      },
      {
        id: 'overdue-oldest', title: 'Oldest overdue', completed: false, categoryId: null,
        createdAt: '2026-07-10T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-13',
      },
    ]);

    await page.ionViewWillEnter();

    expect(page.displayedTasks.map((task) => task.id)).toEqual([
      'none-newest',
      'upcoming-completed',
      'today-completed',
      'overdue-completed',
      'overdue-newest',
      'overdue-oldest',
    ]);

    page.dueDateFilter = 'overdue';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['overdue-newest', 'overdue-oldest']);

    page.dueDateFilter = 'today';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['today-completed']);

    page.dueDateFilter = 'upcoming';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['upcoming-completed']);

    page.dueDateFilter = 'none';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['none-newest']);
  });

  it('applies overdue, today, and upcoming boundaries correctly across a month and year transition', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    spyOn(page, 'localToday').and.returnValue('2027-01-01');
    service.list.and.resolveTo([
      {
        id: 'upcoming-jan-02', title: 'January second', completed: false, categoryId: null,
        createdAt: '2027-01-01T10:00:00.000Z', priority: 'medium', dueDate: '2027-01-02',
      },
      {
        id: 'today-jan-01', title: 'New year day', completed: true, categoryId: null,
        createdAt: '2026-12-31T10:00:00.000Z', priority: 'medium', dueDate: '2027-01-01',
      },
      {
        id: 'overdue-dec-31', title: 'Year end', completed: false, categoryId: null,
        createdAt: '2026-12-30T10:00:00.000Z', priority: 'medium', dueDate: '2026-12-31',
      },
    ]);

    await page.ionViewWillEnter();

    page.dueDateFilter = 'overdue';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['overdue-dec-31']);

    page.dueDateFilter = 'today';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['today-jan-01']);

    page.dueDateFilter = 'upcoming';
    expect(page.displayedTasks.map((task) => task.id)).toEqual(['upcoming-jan-02']);
  });

  it('reapplies the selected overdue filter after reload and removes completed overdue work from the result', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    spyOn(page, 'localToday').and.returnValue('2026-07-15');
    service.list.and.returnValues(
      Promise.resolve([
        {
          id: 'overdue-task', title: 'Past due', completed: false, categoryId: null,
          createdAt: '2026-07-10T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-14',
        },
      ]),
      Promise.resolve([
        {
          id: 'overdue-task', title: 'Past due', completed: true, categoryId: null,
          createdAt: '2026-07-10T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-14',
        },
      ]),
    );
    service.setCompleted.and.resolveTo({} as Task);

    await page.ionViewWillEnter();
    page.dueDateFilter = 'overdue';

    expect(page.displayedTasks.map((task) => task.id)).toEqual(['overdue-task']);

    await page.toggleTask(page.tasks[0]);

    expect(page.dueDateFilter).toBe('overdue');
    expect(page.tasks[0].dueDate).toBe('2026-07-14');
    expect(page.displayedTasks).toEqual([]);
  });

  it('ignores due-date filtering outside the all route so category views do not combine filters', async () => {
    const page = createPage({
      snapshot: {
        data: { filterKind: 'category' },
        paramMap: new Map([['categoryId', 'home']]),
      } as never,
    });
    spyOn(page, 'localToday').and.returnValue('2026-07-15');
    service.list.and.resolveTo([
      {
        id: 'home-overdue', title: 'Home overdue', completed: false, categoryId: 'home',
        createdAt: '2026-07-10T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-14',
      },
      {
        id: 'home-none', title: 'Home none', completed: false, categoryId: 'home',
        createdAt: '2026-07-09T12:00:00.000Z', priority: 'medium', dueDate: null,
      },
    ]);

    await page.ionViewWillEnter();
    page.dueDateFilter = 'overdue';

    expect(page.displayedTasks.map((task) => task.id)).toEqual(['home-overdue', 'home-none']);
  });

  it('renders due-date metadata and a filtered empty state without falling back to the global empty copy', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    spyOn(page, 'localToday').and.returnValue('2026-07-15');
    service.list.and.resolveTo([
      {
        id: 'overdue-task', title: 'Past due', completed: false, categoryId: null,
        createdAt: '2026-07-10T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-14',
      },
      {
        id: 'today-task', title: 'Today task', completed: false, categoryId: null,
        createdAt: '2026-07-09T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-15',
      },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);
    const component = fixture.componentInstance;

    await component.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Due: 2026-07-14');
    expect(fixture.nativeElement.textContent).toContain('Overdue');
    expect(fixture.nativeElement.textContent).toContain('Due: 2026-07-15');

    component.dueDateFilter = 'upcoming';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tasks match this due-date filter.');
    expect(fixture.nativeElement.textContent).not.toContain('No tasks yet');
  });

  it('keeps the global empty state when no tasks exist at all', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tasks yet');
    expect(fixture.nativeElement.textContent).not.toContain('No tasks match this due-date filter.');
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

  it('refreshes a renamed category label without changing the task category association', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    categoryService.list.and.returnValues(
      Promise.resolve([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]),
      Promise.resolve([{ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' }]),
    );

    await page.ionViewWillEnter();
    await page.ionViewWillEnter();

    expect(page.tasks[0].categoryId).toBe('home');
    expect(page.getCategoryName('home')).toBe('House');
  });

  it('falls back when a task references a missing category name', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });

    await page.ionViewWillEnter();

    expect(page.getCategoryName('missing')).toBe('Unknown category');
  });

  it('builds the edit route for an existing task without changing task actions', () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });

    expect(page.getTaskEditLink({ id: 'task-1' } as Task)).toBe('/tasks/task-1/edit');
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
