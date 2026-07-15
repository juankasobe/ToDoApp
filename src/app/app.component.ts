import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CategoryService, MenuFilter } from './categories/services/category.service';
import { SQLiteService } from './core/storage/sqlite.service';

export type MenuItem = {
  label: string;
  url: string;
};

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  startupErrorMessage = '';
  isInitializing = true;

  private readonly platform = inject(Platform);
  private readonly sqliteService = inject(SQLiteService);
  private readonly categoryService = inject(CategoryService);
  private categoryChangesSubscription?: Subscription;

  constructor() {
    void this.initializeApp();
  }

  ngOnInit(): void {
    this.categoryChangesSubscription = this.categoryService.categoryChanges$.subscribe(() => {
      void this.reloadMenuItemsSafely('Category-change');
    });
  }

  ngOnDestroy(): void {
    this.categoryChangesSubscription?.unsubscribe();
  }

  retryStartup(): Promise<void> {
    return this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    this.isInitializing = true;
    this.startupErrorMessage = '';

    try {
      await this.platform.ready();
      await this.sqliteService.initialize();
      await this.loadMenuItems();
    } catch (error) {
      console.error('SQLite startup initialization failed.', error);
      this.startupErrorMessage = 'Local storage could not start. Your tasks are still on this device. Try again.';
    } finally {
      this.isInitializing = false;
    }
  }

  async loadMenuItems(): Promise<void> {
    const filters = await this.categoryService.getMenuFilters();
    this.menuItems = filters.map((item) => ({ label: item.label, url: this.toUrl(item) }));
  }

  onMenuWillOpen(): Promise<void> {
    return this.reloadMenuItemsSafely('Menu-open');
  }

  private async reloadMenuItemsSafely(source: 'Category-change' | 'Menu-open'): Promise<void> {
    try {
      await this.loadMenuItems();
    } catch (error) {
      console.error(`${source} menu reload failed.`, error);
    }
  }

  private toUrl(item: MenuFilter): string {
    if (item.filter.kind === 'uncategorized') {
      return '/tasks/uncategorized';
    }

    if (item.filter.kind === 'category') {
      return `/tasks/category/${item.filter.categoryId}`;
    }

    return '/tasks';
  }
}
