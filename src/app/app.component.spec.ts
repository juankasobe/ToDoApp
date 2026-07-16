import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { CategoryService } from './categories/services/category.service';
import { SQLiteService } from './core/storage/sqlite.service';

@Component({ standalone: false, template: '' })
class RouteStubComponent {}

describe('AppComponent', () => {
  let categoryService: jasmine.SpyObj<CategoryService>;
  let sqliteService: jasmine.SpyObj<SQLiteService>;
  let consoleErrorSpy: jasmine.Spy<typeof console.error>;
  let categoryChanges: Subject<void>;

  beforeEach(async () => {
    categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['getMenuFilters']);
    categoryChanges = new Subject<void>();
    Object.defineProperty(categoryService, 'categoryChanges$', { value: categoryChanges.asObservable() });
    sqliteService = jasmine.createSpyObj<SQLiteService>('SQLiteService', ['initialize']);
    consoleErrorSpy = spyOn(console, 'error');
    sqliteService.initialize.and.callFake(() => Promise.resolve({} as never));
    categoryService.getMenuFilters.and.resolveTo([
      { label: 'All Tasks', filter: { kind: 'all' } },
      { label: 'Uncategorized', filter: { kind: 'uncategorized' } },
      { label: 'Health', filter: { kind: 'category', categoryId: 'health' } },
    ]);

    await TestBed.configureTestingModule({
      declarations: [AppComponent, RouteStubComponent],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'tasks', component: RouteStubComponent },
          { path: 'tasks/uncategorized', component: RouteStubComponent },
          { path: 'tasks/category/:categoryId', component: RouteStubComponent },
          { path: 'tasks/new', component: RouteStubComponent },
          { path: 'categories', component: RouteStubComponent },
        ]),
      ],
      providers: [
        { provide: Platform, useValue: { ready: () => Promise.resolve() } },
        { provide: SQLiteService, useValue: sqliteService },
        { provide: CategoryService, useValue: categoryService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('loads side-menu entries for all tasks, uncategorized tasks, and categories', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.loadMenuItems();

    expect(app.menuItems).toEqual([
      { label: 'All Tasks', url: '/tasks' },
      { label: 'Uncategorized', url: '/tasks/uncategorized' },
      { label: 'Health', url: '/tasks/category/health' },
    ]);
  });

  it('marks each fixed destination active only for its exact route', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    await renderMenuAt(fixture, router, '/tasks/new');

    expect(menuItemByLabel(fixture, 'New Task').classList).toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'Categories').classList).not.toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'All Tasks').classList).not.toContain('menu-link--active');

    await renderMenuAt(fixture, router, '/categories');

    expect(menuItemByLabel(fixture, 'Categories').classList).toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'New Task').classList).not.toContain('menu-link--active');
  });

  it('keeps dynamic category destinations and activates only the matching category route', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    await renderMenuAt(fixture, router, '/categories');

    const healthLink = menuItemByLabel(fixture, 'Health');
    healthLink.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/tasks/category/health');
    expect(healthLink.classList).toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'All Tasks').classList).not.toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'Uncategorized').classList).not.toContain('menu-link--active');
  });

  it('keeps distinct dynamic category routes mutually exclusive when the active route changes', async () => {
    categoryService.getMenuFilters.and.resolveTo([
      { label: 'All Tasks', filter: { kind: 'all' } },
      { label: 'Uncategorized', filter: { kind: 'uncategorized' } },
      { label: 'Health', filter: { kind: 'category', categoryId: 'health' } },
      { label: 'Home', filter: { kind: 'category', categoryId: 'home' } },
    ]);
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    await renderMenuAt(fixture, router, '/tasks/category/health');

    expect(menuItemByLabel(fixture, 'Health').classList).toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'Home').classList).not.toContain('menu-link--active');

    await renderMenuAt(fixture, router, '/tasks/category/home');

    expect(menuItemByLabel(fixture, 'Home').classList).toContain('menu-link--active');
    expect(menuItemByLabel(fixture, 'Health').classList).not.toContain('menu-link--active');
  });

  it('renders transparent Ionic list hosts so the menu shell remains visible between navigation rows', async () => {
    const fixture = TestBed.createComponent(AppComponent);

    await fixture.componentInstance.loadMenuItems();
    fixture.detectChanges();

    const menuLists = fixture.nativeElement.querySelectorAll('ion-list') as NodeListOf<HTMLElement>;

    expect(menuLists.length).toBe(2);
    for (const menuList of Array.from(menuLists)) {
      expect(getComputedStyle(menuList).getPropertyValue('--ion-item-background').trim()).toBe('transparent');
    }
    expect(getComputedStyle(fixture.nativeElement.querySelector('ion-list-header')).getPropertyValue('--background').trim()).toBe('transparent');
  });

  it('refreshes a renamed category menu label through the category change notification', async () => {
    categoryService.getMenuFilters.and.returnValues(
      Promise.resolve([
        { label: 'All Tasks', filter: { kind: 'all' as const } },
        { label: 'Home', filter: { kind: 'category' as const, categoryId: 'home' } },
      ]),
      Promise.resolve([
        { label: 'All Tasks', filter: { kind: 'all' as const } },
        { label: 'House', filter: { kind: 'category' as const, categoryId: 'home' } },
      ]),
    );
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await fixture.whenStable();
    app.ngOnInit();
    categoryChanges.next();
    await fixture.whenStable();

    expect(app.menuItems).toEqual([
      { label: 'All Tasks', url: '/tasks' },
      { label: 'House', url: '/tasks/category/home' },
    ]);
  });

  it('keeps the current menu when a category-change reload fails', async () => {
    const reloadError = new Error('menu-load-failed');
    categoryService.getMenuFilters.and.resolveTo([
      { label: 'All Tasks', filter: { kind: 'all' as const } },
      { label: 'Home', filter: { kind: 'category' as const, categoryId: 'home' } },
    ]);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await fixture.whenStable();
    await app.loadMenuItems();
    categoryService.getMenuFilters.and.rejectWith(reloadError);
    app.ngOnInit();
    const reloadSpy = spyOn(app as unknown as { reloadMenuItemsSafely: (source: string) => Promise<void> }, 'reloadMenuItemsSafely').and.callThrough();
    categoryChanges.next();
    await reloadSpy.calls.mostRecent().returnValue;

    expect(app.menuItems).toEqual([
      { label: 'All Tasks', url: '/tasks' },
      { label: 'Home', url: '/tasks/category/home' },
    ]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Category-change menu reload failed.', reloadError);
  });

  it('keeps the current menu when a menu-open reload fails', async () => {
    const reloadError = new Error('menu-load-failed');
    categoryService.getMenuFilters.and.resolveTo([
      { label: 'All Tasks', filter: { kind: 'all' as const } },
      { label: 'Home', filter: { kind: 'category' as const, categoryId: 'home' } },
    ]);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.loadMenuItems();
    categoryService.getMenuFilters.and.rejectWith(reloadError);

    await app.onMenuWillOpen();

    expect(app.menuItems).toEqual([
      { label: 'All Tasks', url: '/tasks' },
      { label: 'Home', url: '/tasks/category/home' },
    ]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Menu-open menu reload failed.', reloadError);
  });

  it('shows a retryable startup error when SQLite initialization fails', async () => {
    const error = new Error('sqlite-failed');
    sqliteService.initialize.and.rejectWith(error);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await fixture.whenStable();

    expect(app.startupErrorMessage).toContain('Local storage could not start');
    expect(app.isInitializing).toBeFalse();
    expect(consoleErrorSpy).toHaveBeenCalledWith('SQLite startup initialization failed.', error);
  });

  it('clears the startup error after a successful retry', async () => {
    sqliteService.initialize.and.rejectWith(new Error('sqlite-failed'));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    await fixture.whenStable();
    sqliteService.initialize.and.resolveTo();

    await app.retryStartup();

    expect(sqliteService.initialize).toHaveBeenCalledTimes(2);
    expect(app.startupErrorMessage).toBe('');
    expect(app.menuItems.length).toBe(3);
  });

});

async function renderMenuAt(fixture: ReturnType<typeof TestBed.createComponent<AppComponent>>, router: Router, url: string): Promise<void> {
  await fixture.componentInstance.loadMenuItems();
  fixture.detectChanges();
  await router.navigateByUrl(url);
  await fixture.whenStable();
  fixture.detectChanges();
}

function menuItemByLabel(fixture: ReturnType<typeof TestBed.createComponent<AppComponent>>, label: string): HTMLElement {
  const items = fixture.nativeElement.querySelectorAll('ion-item') as NodeListOf<HTMLElement>;
  const item = Array.from(items).find((element) => element.textContent?.trim() === label);

  expect(item).withContext(`Expected a menu item labelled ${label}`).toBeDefined();
  return item as HTMLElement;
}
