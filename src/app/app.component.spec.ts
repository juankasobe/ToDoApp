import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';

import { AppComponent } from './app.component';
import { CategoryService } from './categories/services/category.service';
import { SQLiteService } from './core/storage/sqlite.service';

describe('AppComponent', () => {
  let categoryService: jasmine.SpyObj<CategoryService>;
  let sqliteService: jasmine.SpyObj<SQLiteService>;
  let consoleErrorSpy: jasmine.Spy<typeof console.error>;

  beforeEach(async () => {
    categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['getMenuFilters']);
    sqliteService = jasmine.createSpyObj<SQLiteService>('SQLiteService', ['initialize']);
    consoleErrorSpy = spyOn(console, 'error');
    sqliteService.initialize.and.callFake(() => Promise.resolve({} as never));
    categoryService.getMenuFilters.and.resolveTo([
      { label: 'All Tasks', filter: { kind: 'all' } },
      { label: 'Uncategorized', filter: { kind: 'uncategorized' } },
      { label: 'Health', filter: { kind: 'category', categoryId: 'health' } },
    ]);

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
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
