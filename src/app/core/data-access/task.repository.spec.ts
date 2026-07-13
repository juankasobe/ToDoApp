import { TaskRepository } from './task.repository';

describe('TaskRepository contract', () => {
  it('allows listing all, uncategorized, or category-scoped tasks', async () => {
    const repository: TaskRepository = {
      list: jasmine.createSpy('list').and.resolveTo([]),
      create: jasmine.createSpy('create'),
      setCompleted: jasmine.createSpy('setCompleted'),
      delete: jasmine.createSpy('delete'),
    };

    await repository.list();
    await repository.list({ categoryId: null });
    await repository.list({ categoryId: 'category-1' });

    expect(repository.list).toHaveBeenCalledWith();
    expect(repository.list).toHaveBeenCalledWith({ categoryId: null });
    expect(repository.list).toHaveBeenCalledWith({ categoryId: 'category-1' });
  });
});
