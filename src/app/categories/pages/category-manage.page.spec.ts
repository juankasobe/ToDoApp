import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CategoryService } from '../services/category.service';
import { CATEGORY_ERROR_CODE } from '../models/category-error';
import { CategoryManagePage } from './category-manage.page';

describe('CategoryManagePage', () => {
  let service: jasmine.SpyObj<CategoryService>;
  let page: CategoryManagePage;

  beforeEach(() => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['list', 'create', 'rename', 'delete']);
    service.list.and.resolveTo([
      { id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);

    TestBed.configureTestingModule({
      declarations: [CategoryManagePage],
      imports: [FormsModule, IonicModule.forRoot()],
      providers: [CategoryManagePage, { provide: CategoryService, useValue: service }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    page = TestBed.inject(CategoryManagePage);
  });

  it('loads categories for management', async () => {
    await page.ionViewWillEnter();

    expect(page.categories).toEqual([
      { id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' },
    ]);
  });

  it('renders an initial category-load error and retries loading when requested', async () => {
    service.list.and.returnValues(
      Promise.reject(new Error('load-failed')),
      Promise.resolve([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]),
    );
    const consoleErrorSpy = spyOn(console, 'error');
    const fixture = TestBed.createComponent(CategoryManagePage);
    const component = fixture.componentInstance;

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Categories could not be loaded. Try again.');
    expect(fixture.nativeElement.textContent).toContain('Retry');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Category list load failed.', jasmine.any(Error));

    await component.retryCategoryLoad();

    expect(component.categories).toEqual([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]);
    expect(component.errorMessage).toBe('');
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
    service.create.and.rejectWith(new Error(CATEGORY_ERROR_CODE.EMPTY_NAME));
    page.name = '   ';

    await page.createCategory();

    expect(page.errorMessage).toBe('Enter a category name.');
    expect(service.list).not.toHaveBeenCalled();
  });

  it('shows blocked-delete feedback and leaves categories visible', async () => {
    service.delete.and.rejectWith(new Error(CATEGORY_ERROR_CODE.NOT_EMPTY));
    await page.ionViewWillEnter();
    service.list.calls.reset();

    await page.deleteCategory('home');

    expect(page.errorMessage).toBe('Move or delete tasks in this category before deleting it.');
    expect(service.list).not.toHaveBeenCalled();
    expect(page.categories[0].name).toBe('Home');
  });

  it('prefills row-local editing and clears it when cancelled or re-entering the page', async () => {
    await page.ionViewWillEnter();

    page.startEditing(page.categories[0]);

    expect(page.editingCategoryId).toBe('home');
    expect(page.editingName).toBe('Home');

    page.editingName = 'House';
    page.cancelEditing();

    expect(page.editingCategoryId).toBeNull();
    expect(page.editingName).toBe('');

    page.startEditing(page.categories[0]);
    await page.ionViewWillEnter();

    expect(page.editingCategoryId).toBeNull();
    expect(page.editingName).toBe('');
  });

  it('renames the edited category, reloads its persisted label, and resets edit state', async () => {
    service.rename.and.resolveTo({ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' });
    service.list.and.returnValues(
      Promise.resolve([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]),
      Promise.resolve([{ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' }]),
    );
    await page.ionViewWillEnter();
    page.startEditing(page.categories[0]);
    page.editingName = '  House  ';

    await page.saveEditing();

    expect(service.rename).toHaveBeenCalledWith('home', { name: '  House  ' });
    expect(page.categories).toEqual([{ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' }]);
    expect(page.editingCategoryId).toBeNull();
    expect(page.editingName).toBe('');
    expect(page.errorMessage).toBe('');
  });

  it('retains the edit target and typed text with feedback after a failed rename', async () => {
    service.rename.and.rejectWith(new Error(CATEGORY_ERROR_CODE.DUPLICATE_NAME));
    spyOn(console, 'error');
    await page.ionViewWillEnter();
    page.startEditing(page.categories[0]);
    page.editingName = '  HOME  ';

    await page.saveEditing();

    expect(page.editingCategoryId).toBe('home');
    expect(page.editingName).toBe('  HOME  ');
    expect(page.errorMessage).toBe('A category with this name already exists.');
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('edits a category through the rendered Edit, input, and Save bindings', async () => {
    const fixture = TestBed.createComponent(CategoryManagePage);
    const component = fixture.componentInstance;
    service.rename.and.resolveTo({ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' });
    service.list.and.returnValues(
      Promise.resolve([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]),
      Promise.resolve([{ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' }]),
    );
    await component.ionViewWillEnter();
    fixture.detectChanges();

    const editButton = fixture.nativeElement.querySelector('ion-item-option[aria-label="Edit category Home"]');
    editButton.click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('ion-input[aria-label="Category name"]');
    input.value = 'House';
    input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button[aria-label="Save category edit"]').click();
    await fixture.whenStable();

    expect(service.rename).toHaveBeenCalledWith('home', { name: 'House' });
    expect(component.editingCategoryId).toBeNull();
  });

  it('cancels a category edit through the rendered Edit and Cancel bindings', async () => {
    const fixture = TestBed.createComponent(CategoryManagePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('ion-item-option[aria-label="Edit category Home"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button[aria-label="Cancel category edit"]').click();
    fixture.detectChanges();

    expect(component.editingCategoryId).toBeNull();
    expect(component.editingName).toBe('');
    expect(service.rename).not.toHaveBeenCalled();
  });

  it('visibly restores the original label on Cancel and renders the persisted renamed label on Save', async () => {
    const fixture = TestBed.createComponent(CategoryManagePage);
    const component = fixture.componentInstance;
    service.rename.and.resolveTo({ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' });
    service.list.and.returnValues(
      Promise.resolve([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]),
      Promise.resolve([{ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' }]),
    );
    await component.ionViewWillEnter();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('ion-item-option[aria-label="Edit category Home"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button[aria-label="Cancel category edit"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Home');
    expect(fixture.nativeElement.querySelector('ion-input[aria-label="Category name"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-button[aria-label="Save category edit"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-button[aria-label="Cancel category edit"]')).toBeNull();

    fixture.nativeElement.querySelector('ion-item-option[aria-label="Edit category Home"]').click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('ion-input[aria-label="Category name"]');
    input.value = 'House';
    input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.nativeElement.querySelector('ion-button[aria-label="Save category edit"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('House');
    expect(fixture.nativeElement.querySelector('ion-input[aria-label="Category name"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-button[aria-label="Save category edit"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-button[aria-label="Cancel category edit"]')).toBeNull();
  });

  it('renders the post-save reload failure with a retry control after a saved rename cannot reload', async () => {
    service.rename.and.resolveTo({ id: 'home', name: 'House', createdAt: '2026-07-09T20:00:00.000Z' });
    service.list.and.returnValues(
      Promise.resolve([{ id: 'home', name: 'Home', createdAt: '2026-07-09T20:00:00.000Z' }]),
      Promise.reject(new Error('load-failed')),
      Promise.reject(new Error('load-failed')),
    );
    spyOn(console, 'error');
    const fixture = TestBed.createComponent(CategoryManagePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    component.startEditing(component.categories[0]);
    component.editingName = 'House';

    await component.saveEditing();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Category saved, but the list could not refresh. Try again.');
    expect(fixture.nativeElement.textContent).toContain('Retry');

    await component.retryCategoryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Category saved, but the list could not refresh. Try again.');
  });

  it('renders a visible error when a persisted rename reports its category is missing', async () => {
    service.rename.and.rejectWith(new Error(CATEGORY_ERROR_CODE.NOT_FOUND));
    const consoleErrorSpy = spyOn(console, 'error');
    const fixture = TestBed.createComponent(CategoryManagePage);
    const component = fixture.componentInstance;
    await component.ionViewWillEnter();
    component.startEditing(component.categories[0]);

    await component.saveEditing();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This category no longer exists.');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Category rename failed.', jasmine.any(Error));
  });
});
