export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TaskPriority = typeof TASK_PRIORITIES[number];

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';
export const DEFAULT_TASK_PRIORITY_SQL = `'${DEFAULT_TASK_PRIORITY}'`;
export const TASK_PRIORITY_SQL_VALUES = TASK_PRIORITIES.map((priority) => `'${priority}'`).join(', ');

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export function isTaskDueDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31;

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  createdAt: string;
  priority: TaskPriority;
  dueDate: string | null;
}
