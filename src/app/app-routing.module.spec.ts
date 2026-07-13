import { appRoutes } from './app-routing.module';

describe('appRoutes', () => {
  it('routes all tasks, uncategorized tasks, category tasks, task creation, and category management', () => {
    expect(appRoutes.map((route) => route.path)).toEqual([
      '',
      'tasks',
      'tasks/uncategorized',
      'tasks/category/:categoryId',
      'tasks/new',
      'categories',
    ]);
  });

  it('passes task list filter metadata to each scoped task route', () => {
    expect(appRoutes[1].data).toEqual({ filterKind: 'all' });
    expect(appRoutes[2].data).toEqual({ filterKind: 'uncategorized' });
    expect(appRoutes[3].data).toEqual({ filterKind: 'category' });
  });
});
