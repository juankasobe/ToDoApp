import { appRoutes } from './app-routing.module';
import { TaskCreatePage } from './tasks/pages/task-create.page';

describe('appRoutes', () => {
  it('routes all tasks, uncategorized tasks, category tasks, task creation, and category management', () => {
    expect(appRoutes.map((route) => route.path)).toEqual([
      '',
      'tasks',
      'tasks/uncategorized',
      'tasks/category/:categoryId',
      'tasks/new',
      'tasks/:taskId/edit',
      'categories',
    ]);
  });

  it('routes task edit requests to the reused task form page', () => {
    const editRoute = appRoutes.find((route) => route.path === 'tasks/:taskId/edit');

    expect(editRoute?.component).toBe(TaskCreatePage);
  });

  it('passes task list filter metadata to each scoped task route', () => {
    expect(appRoutes[1].data).toEqual({ filterKind: 'all' });
    expect(appRoutes[2].data).toEqual({ filterKind: 'uncategorized' });
    expect(appRoutes[3].data).toEqual({ filterKind: 'category' });
  });
});
