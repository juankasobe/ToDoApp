import { Task, TaskPriority } from '../../tasks/models/task.model';

export type TaskListFilter = {
  categoryId?: string | null;
};

export type CreateTaskInput = {
  title: string;
  categoryId: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
};

export type UpdateTaskInput = {
  title: string;
  categoryId: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
};

export abstract class TaskRepository {
  abstract list(filter?: TaskListFilter): Promise<Task[]>;
  abstract create(input: CreateTaskInput): Promise<Task>;
  abstract getById(id: string): Promise<Task>;
  abstract update(id: string, input: UpdateTaskInput): Promise<Task>;
  abstract setCompleted(id: string, completed: boolean): Promise<Task>;
  abstract delete(id: string): Promise<void>;
}
