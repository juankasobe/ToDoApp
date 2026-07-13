import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { CategoryManagePage } from './categories/pages/category-manage.page';
import { TaskCreatePage } from './tasks/pages/task-create.page';
import { TaskListPage } from './tasks/pages/task-list.page';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
  {
    path: 'tasks',
    component: TaskListPage,
    data: { filterKind: 'all' },
  },
  {
    path: 'tasks/uncategorized',
    component: TaskListPage,
    data: { filterKind: 'uncategorized' },
  },
  {
    path: 'tasks/category/:categoryId',
    component: TaskListPage,
    data: { filterKind: 'category' },
  },
  {
    path: 'tasks/new',
    component: TaskCreatePage,
  },
  {
    path: 'categories',
    component: CategoryManagePage,
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
