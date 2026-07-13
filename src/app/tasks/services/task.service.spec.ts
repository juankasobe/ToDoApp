import { TestBed } from '@angular/core/testing';

import { TaskRepository } from '../../core/data-access/task.repository';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let repository: jasmine.SpyObj<TaskRepository>;
  let service: TaskService;

  beforeEach(() => {
    repository = jasmine.createSpyObj<TaskRepository>('TaskRepository', ['list', 'create', 'setCompleted', 'delete']);
    TestBed.configureTestingModule({
      providers: [TaskService, { provide: TaskRepository, useValue: repository }],
    });
    service = TestBed.inject(TaskService);
  });

  it('trims valid titles and creates uncategorized tasks', async () => {
    repository.create.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    const task = await service.create({ title: '  Buy milk  ', categoryId: null });

    expect(task.title).toBe('Buy milk');
    expect(repository.create).toHaveBeenCalledWith({ title: 'Buy milk', categoryId: null });
  });

  it('rejects whitespace-only task titles before calling the repository', async () => {
    await expectAsync(service.create({ title: '   ', categoryId: null })).toBeRejectedWithError('empty-title');

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('maps repository category lookup failures to task domain errors', async () => {
    repository.create.and.rejectWith(new Error('category-not-found'));

    await expectAsync(service.create({ title: 'Plan workout', categoryId: 'missing-category' }))
      .toBeRejectedWithError('category-not-found');
  });

  it('orchestrates all, uncategorized, and category filters for task lists', async () => {
    repository.list.and.resolveTo([]);

    await service.list({ kind: 'all' });
    await service.list({ kind: 'uncategorized' });
    await service.list({ kind: 'category', categoryId: 'health' });

    expect(repository.list).toHaveBeenCalledWith();
    expect(repository.list).toHaveBeenCalledWith({ categoryId: null });
    expect(repository.list).toHaveBeenCalledWith({ categoryId: 'health' });
  });

  it('passes completion toggles through to the repository', async () => {
    repository.setCompleted.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: true,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    const task = await service.setCompleted('task-1', true);

    expect(task.completed).toBeTrue();
    expect(repository.setCompleted).toHaveBeenCalledWith('task-1', true);
  });

  it('deletes tasks through the repository without requiring category changes', async () => {
    await service.delete('task-1');

    expect(repository.delete).toHaveBeenCalledWith('task-1');
  });
});
