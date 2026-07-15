export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TaskPriority = typeof TASK_PRIORITIES[number];

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';
export const DEFAULT_TASK_PRIORITY_SQL = `'${DEFAULT_TASK_PRIORITY}'`;
export const TASK_PRIORITY_SQL_VALUES = TASK_PRIORITIES.map((priority) => `'${priority}'`).join(', ');

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  createdAt: string;
  priority: TaskPriority;
}
