import { TestBed } from '@angular/core/testing';

import { TaskRepository } from '../../core/data-access/task.repository';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let repository: jasmine.SpyObj<TaskRepository>;
  let service: TaskService;

  beforeEach(() => {
    repository = jasmine.createSpyObj<TaskRepository>('TaskRepository', ['list', 'create', 'getById', 'update', 'setCompleted', 'delete']);
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

  it('reads tasks by id through the repository', async () => {
    repository.getById.and.resolveTo({
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: 'home',
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    const task = await service.getById('task-1');

    expect(task.title).toBe('Buy milk');
    expect(repository.getById).toHaveBeenCalledWith('task-1');
  });

  it('trims valid titles and updates the selected category', async () => {
    repository.update.and.resolveTo({
      id: 'task-1',
      title: 'Buy oat milk',
      completed: true,
      categoryId: 'errands',
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    const task = await service.update({ id: 'task-1', title: '  Buy oat milk  ', categoryId: 'errands' });

    expect(task.completed).toBeTrue();
    expect(repository.update).toHaveBeenCalledWith('task-1', { title: 'Buy oat milk', categoryId: 'errands' });
  });

  it('passes a null category update command to clear task assignment', async () => {
    repository.update.and.resolveTo({
      id: 'task-1',
      title: 'Inbox item',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
    });

    const task = await service.update({ id: 'task-1', title: 'Inbox item', categoryId: null });

    expect(task.categoryId).toBeNull();
    expect(repository.update).toHaveBeenCalledWith('task-1', { title: 'Inbox item', categoryId: null });
  });

  it('rejects whitespace-only update titles before calling the repository', async () => {
    await expectAsync(service.update({ id: 'task-1', title: '   ', categoryId: null })).toBeRejectedWithError('empty-title');

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('propagates missing task and category failures during update', async () => {
    repository.update.and.rejectWith(new Error('task-not-found'));

    await expectAsync(service.update({ id: 'missing-task', title: 'Plan workout', categoryId: null }))
      .toBeRejectedWithError('task-not-found');

    repository.update.and.rejectWith(new Error('category-not-found'));

    await expectAsync(service.update({ id: 'task-1', title: 'Plan workout', categoryId: 'missing-category' }))
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
