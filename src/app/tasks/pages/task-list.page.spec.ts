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

  function getCompiledTaskListStyles(): string {
    return Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .find((styles) => styles.includes('--task-list-blue-black')) ?? '';
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

  it('derives visible progress from the all-route displayed collection, including a due-date filter and no matches', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    spyOn(page, 'localToday').and.returnValue('2026-07-15');
    service.list.and.resolveTo([
      { id: 'today-complete', title: 'Today complete', completed: true, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: '2026-07-15' },
      { id: 'today-open', title: 'Today open', completed: false, categoryId: null, createdAt: '2026-07-14T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-15' },
      { id: 'upcoming-open', title: 'Upcoming open', completed: false, categoryId: null, createdAt: '2026-07-13T12:00:00.000Z', priority: 'low', dueDate: '2026-07-16' },
    ]);

    await page.ionViewWillEnter();

    expect(page.progressSummary).toEqual({ total: 3, completed: 1, percentage: 33, value: 0.33 });

    page.dueDateFilter = 'today';
    expect(page.progressSummary).toEqual({ total: 2, completed: 1, percentage: 50, value: 0.5 });

    page.dueDateFilter = 'none';
    expect(page.progressSummary).toEqual({ total: 0, completed: 0, percentage: 0, value: 0 });
  });

  it('derives visible progress from every task on a scoped route regardless of the all-route due-date filter', async () => {
    const page = createPage({
      snapshot: {
        data: { filterKind: 'category' },
        paramMap: new Map([['categoryId', 'home']]),
      } as never,
    });
    service.list.and.resolveTo([
      { id: 'complete', title: 'Complete', completed: true, categoryId: 'home', createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: '2026-07-14' },
      { id: 'open', title: 'Open', completed: false, categoryId: 'home', createdAt: '2026-07-14T12:00:00.000Z', priority: 'low', dueDate: null },
    ]);

    await page.ionViewWillEnter();
    page.dueDateFilter = 'none';

    expect(page.progressSummary).toEqual({ total: 2, completed: 1, percentage: 50, value: 0.5 });
  });

  it('creates one deterministic presentation snapshot for the currently displayed tasks and progress', async () => {
    const page = createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    spyOn(page, 'localToday').and.returnValue('2026-07-15');
    service.list.and.resolveTo([
      { id: 'today-complete', title: 'Today complete', completed: true, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: '2026-07-15' },
      { id: 'upcoming-open', title: 'Upcoming open', completed: false, categoryId: null, createdAt: '2026-07-14T12:00:00.000Z', priority: 'low', dueDate: '2026-07-16' },
    ]);

    await page.ionViewWillEnter();
    page.dueDateFilter = 'today';

    const snapshot = page.presentationSnapshot;

    expect(snapshot.displayedTasks.map((task) => task.id)).toEqual(['today-complete']);
    expect(snapshot.progressSummary).toEqual({ total: 1, completed: 1, percentage: 100, value: 1 });
  });

  it('keeps compact, focus, and reduced-motion rules in the compiled task-list stylesheet', () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();

    const styles = getCompiledTaskListStyles();

    expect(styles).toMatch(/@media\s*\(max-width:\s*20rem\)[\s\S]*?\.task-list-content[\s\S]*?padding-inline:\s*0\.75rem/);
    expect(styles).toMatch(/:is\(ion-button,\s*ion-checkbox,\s*ion-select,\s*ion-item-option,\s*\.task-card,\s*\.due-date-filter\):focus-within[\s\S]*?outline:\s*3px solid var\(--task-list-focus\)/);
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none !important[\s\S]*?transition:\s*none !important/);
  });

  it('renders semantic visible progress and pointer-isolated moon and cloud decoration', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'complete', title: 'Complete', completed: true, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: null },
      { id: 'open', title: 'Open', completed: false, categoryId: null, createdAt: '2026-07-14T12:00:00.000Z', priority: 'low', dueDate: null },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const decoration = fixture.nativeElement.querySelector('.task-list-decoration');
    const progressBar = fixture.nativeElement.querySelector('ion-progress-bar');

    expect(fixture.nativeElement.textContent).toContain('Visible progress: 1 of 2 completed');
    expect(progressBar.getAttribute('aria-label')).toBe('Visible task progress');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
    expect(progressBar.getAttribute('value')).toBe('0.5');
    expect(decoration.getAttribute('aria-hidden')).toBe('true');
    expect(decoration.hasAttribute('tabindex')).toBeFalse();
    expect(decoration.querySelector('.task-list-moon')).not.toBeNull();
    expect(decoration.querySelector('.task-list-cloud')).not.toBeNull();
  });

  it('renders one visible progress percentage while keeping the semantic progress value', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'complete', title: 'Complete', completed: true, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: null },
      { id: 'open', title: 'Open', completed: false, categoryId: null, createdAt: '2026-07-14T12:00:00.000Z', priority: 'low', dueDate: null },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const progress = fixture.nativeElement.querySelector('[aria-labelledby="visible-progress-title"]');
    const progressBar = fixture.nativeElement.querySelector('ion-progress-bar');

    expect(progress.textContent).toContain('Visible progress: 1 of 2 completed');
    expect(progress.textContent.match(/50%/g)?.length).toBe(1);
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('keeps overdue text beside the task heading and groups the full metadata in two columns', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'overdue', title: 'Past due', completed: false, categoryId: 'home', createdAt: '2026-07-10T12:00:00.000Z', priority: 'high', dueDate: '2026-07-14' },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);
    spyOn(fixture.componentInstance, 'localToday').and.returnValue('2026-07-15');

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h2');
    const titleRow = heading.parentElement;
    const overdue = titleRow.querySelector('[role="status"]');
    const metadata = titleRow.nextElementSibling;

    expect(heading.textContent.trim()).toBe('Past due');
    expect(overdue.textContent.trim()).toBe('Overdue');
    expect(metadata.children.length).toBe(2);
    expect(metadata.children[0].textContent).toContain('Priority: high');
    expect(metadata.children[0].textContent).toContain('Category: Home');
    expect(metadata.children[1].textContent).toContain('Due: 2026-07-14');
    expect(metadata.children[1].textContent).toContain('Status: Open');
  });

  it('keeps completion and uncategorized metadata visible without an overdue status', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'complete', title: 'Finished', completed: true, categoryId: null, createdAt: '2026-07-10T12:00:00.000Z', priority: 'low', dueDate: null },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h2');
    const titleRow = heading.parentElement;
    const metadata = titleRow.nextElementSibling;

    expect(titleRow.querySelector('[role="status"]')).toBeNull();
    expect(metadata.children.length).toBe(2);
    expect(metadata.children[0].textContent).toContain('Priority: low');
    expect(metadata.children[0].textContent).toContain('Uncategorized');
    expect(metadata.children[1].textContent).toContain('Status: Completed');
  });

  it('gives each retained swipe action group a descriptive accessible name', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelector('ion-item-options');

    expect(actions.getAttribute('aria-label')).toBe('Task actions for Buy milk');
    expect(actions.querySelectorAll('ion-item-option').length).toBe(2);
  });

  it('renders labeled edit and destructive delete sliding actions for each visible task', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelectorAll('ion-item-options ion-item-option');

    expect(actions.length).toBe(2);
    expect(actions[0].getAttribute('aria-label')).toBe('Edit task Buy milk');
    expect(actions[0].textContent.trim()).toBe('Edit');
    expect(actions[1].getAttribute('aria-label')).toBe('Delete task Buy milk');
    expect(actions[1].textContent.trim()).toBe('Delete');
  });

  it('labels sliding actions from each rendered task title', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'first', title: 'Plan release', completed: false, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: null },
      { id: 'second', title: 'Review notes', completed: false, categoryId: null, createdAt: '2026-07-14T12:00:00.000Z', priority: 'low', dueDate: null },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const actionLabels = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('ion-item-options ion-item-option'))
      .map((action) => action.getAttribute('aria-label'));

    expect(actionLabels).toEqual([
      'Edit task Plan release',
      'Delete task Plan release',
      'Edit task Review notes',
      'Delete task Review notes',
    ]);
  });

  it('renders a transparent task list with separated cards and palette-owned swipe actions', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'first', title: 'Plan release', completed: false, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'high', dueDate: null },
      { id: 'second', title: 'Review notes', completed: false, categoryId: null, createdAt: '2026-07-14T12:00:00.000Z', priority: 'low', dueDate: null },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('ion-list');
    const cards = fixture.nativeElement.querySelectorAll('ion-item-sliding');
    const actions = fixture.nativeElement.querySelectorAll('ion-item-option');

    expect(getComputedStyle(list).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(cards.length).toBe(2);
    expect(getComputedStyle(cards[0]).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(cards[1]).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(cards[0]).marginBlockEnd).toBe('8px');
    expect(getComputedStyle(cards[1]).marginBlockEnd).toBe('8px');
    expect(actions[0].getAttribute('color')).toBeNull();
    expect(actions[1].getAttribute('color')).toBeNull();
    expect(getComputedStyle(actions[0]).minWidth).toBe('56px');
    expect(getComputedStyle(actions[1]).minWidth).toBe('56px');
    expect(getComputedStyle(actions[0]).getPropertyValue('--background').trim()).toBe('#4b356f');
    expect(getComputedStyle(actions[1]).getPropertyValue('--background').trim()).toBe('#6b294f');
  });

  it('keeps a single task swipe action pair compact and palette-owned', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelectorAll('ion-item-option');

    expect(actions.length).toBe(2);
    expect(actions[0].getAttribute('aria-label')).toBe('Edit task Buy milk');
    expect(actions[1].getAttribute('aria-label')).toBe('Delete task Buy milk');
    expect(getComputedStyle(actions[0]).minWidth).toBe('56px');
    expect(getComputedStyle(actions[1]).minWidth).toBe('56px');
    expect(getComputedStyle(actions[0]).getPropertyValue('--background').trim()).toBe('#4b356f');
    expect(getComputedStyle(actions[1]).getPropertyValue('--background').trim()).toBe('#6b294f');
  });

  it('renders zero progress while retaining the filtered empty-state copy', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'today', title: 'Today', completed: false, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-15' },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);
    spyOn(fixture.componentInstance, 'localToday').and.returnValue('2026-07-15');

    await fixture.componentInstance.ionViewWillEnter();
    fixture.componentInstance.dueDateFilter = 'upcoming';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('ion-progress-bar');
    expect(fixture.nativeElement.textContent).toContain('Visible progress: 0 of 0 completed');
    expect(fixture.nativeElement.textContent).toContain('No tasks match this due-date filter.');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
    expect(progressBar.getAttribute('value')).toBe('0');
  });

  it('keeps the mobile content grid packed when an upcoming filter has no matching tasks', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([
      { id: 'today', title: 'Today', completed: false, categoryId: null, createdAt: '2026-07-15T12:00:00.000Z', priority: 'medium', dueDate: '2026-07-15' },
    ]);
    const fixture = TestBed.createComponent(TaskListPage);
    spyOn(fixture.componentInstance, 'localToday').and.returnValue('2026-07-15');

    await fixture.componentInstance.ionViewWillEnter();
    fixture.componentInstance.dueDateFilter = 'upcoming';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.task-list-content');
    expect(fixture.nativeElement.textContent).toContain('No tasks match this due-date filter.');
    expect(getComputedStyle(content).alignContent).toBe('start');
  });

  it('keeps the mobile content grid packed for the global empty state', async () => {
    createPage({ snapshot: { data: { filterKind: 'all' }, paramMap: new Map() } as never });
    service.list.and.resolveTo([]);
    const fixture = TestBed.createComponent(TaskListPage);

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.task-list-content');
    expect(fixture.nativeElement.textContent).toContain('No tasks yet');
    expect(getComputedStyle(content).alignContent).toBe('start');
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
