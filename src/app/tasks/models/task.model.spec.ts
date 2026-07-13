import { Task } from './task.model';

describe('Task model', () => {
  it('represents an incomplete uncategorized local task without scheduling or sync fields', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
    };

    expect(task).toEqual({
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
    });
    expect('dueDate' in task).toBeFalse();
    expect('syncId' in task).toBeFalse();
  });

  it('represents a task assigned to an existing category', () => {
    const task: Task = {
      id: 'task-2',
      title: 'Plan workout',
      completed: true,
      categoryId: 'category-health',
      createdAt: '2026-07-09T21:00:00.000Z',
    };

    expect(task.categoryId).toBe('category-health');
    expect(task.completed).toBeTrue();
  });
});
