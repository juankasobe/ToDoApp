export const SQLITE_TRUE = 1;
export const SQLITE_FALSE = 0;

export function isSqliteTrue(value: unknown): boolean {
  return Number(value) === SQLITE_TRUE;
}
