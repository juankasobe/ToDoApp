import { DEFAULT_TASK_PRIORITY, isTaskDueDate, isTaskPriority, Task } from './task.model';

describe('Task model', () => {
  it('represents an incomplete uncategorized local task with a nullable due date and no sync fields', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: DEFAULT_TASK_PRIORITY,
      dueDate: null,
    };

    expect(task).toEqual({
      id: 'task-1',
      title: 'Buy milk',
      completed: false,
      categoryId: null,
      createdAt: '2026-07-09T20:00:00.000Z',
      priority: 'medium',
      dueDate: null,
    });
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
      dueDate: '2026-07-15',
    };

    expect(task.categoryId).toBe('category-health');
    expect(task.completed).toBeTrue();
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-07-15');
  });

  it('accepts every supported priority and rejects arbitrary persisted values', () => {
    expect(isTaskPriority('low')).toBeTrue();
    expect(isTaskPriority('medium')).toBeTrue();
    expect(isTaskPriority('high')).toBeTrue();
    expect(isTaskPriority('urgent')).toBeFalse();
    expect(isTaskPriority(undefined)).toBeFalse();
  });

  it('accepts canonical real calendar due dates, including leap days', () => {
    expect(isTaskDueDate('2026-07-15')).toBeTrue();
    expect(isTaskDueDate('2024-02-29')).toBeTrue();
  });

  it('rejects impossible or noncanonical due dates', () => {
    expect(isTaskDueDate('2026-02-29')).toBeFalse();
    expect(isTaskDueDate('2026-02-31')).toBeFalse();
    expect(isTaskDueDate('2026-7-15')).toBeFalse();
    expect(isTaskDueDate('2026-07-15T00:00:00.000Z')).toBeFalse();
  });
});
