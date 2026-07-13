import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CategoryManagePage } from './categories/pages/category-manage.page';
import { SQLiteCategoryRepository } from './core/data-access/sqlite-category.repository';
import { SQLiteTaskRepository } from './core/data-access/sqlite-task.repository';
import { CategoryRepository } from './core/data-access/category.repository';
import { TaskRepository } from './core/data-access/task.repository';
import { SQLiteService } from './core/storage/sqlite.service';
import { TaskCreatePage } from './tasks/pages/task-create.page';
import { TaskListPage } from './tasks/pages/task-list.page';

@NgModule({
  declarations: [AppComponent, TaskListPage, TaskCreatePage, CategoryManagePage],
  imports: [BrowserModule, FormsModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [
    SQLiteService,
    { provide: TaskRepository, useClass: SQLiteTaskRepository },
    { provide: CategoryRepository, useClass: SQLiteCategoryRepository },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
