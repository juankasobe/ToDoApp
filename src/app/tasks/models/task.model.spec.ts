import { DEFAULT_TASK_PRIORITY, isTaskPriority, Task } from './task.model';

describe('Task model', () => {
  it('represents an incomplete uncategorized local task without scheduling or sync fields', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: DEFAULT_TASK_PRIORITY,
    };

    expect(task).toEqual({
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'medium',
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
      priority: 'high',
    };

    expect(task.categoryId).toBe('category-health');
    expect(task.completed).toBeTrue();
    expect(task.priority).toBe('high');
  });

  it('accepts every supported priority and rejects arbitrary persisted values', () => {
    expect(isTaskPriority('low')).toBeTrue();
    expect(isTaskPriority('medium')).toBeTrue();
    expect(isTaskPriority('high')).toBeTrue();
    expect(isTaskPriority('urgent')).toBeFalse();
    expect(isTaskPriority(undefined)).toBeFalse();
  });
});
