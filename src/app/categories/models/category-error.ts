export const CATEGORY_ERROR_CODE = {
  EMPTY_NAME: 'empty-name',
  DUPLICATE_NAME: 'duplicate-name',
  NOT_FOUND: 'category-not-found',
  NOT_EMPTY: 'category-not-empty',
} as const;

export type CategoryErrorCode = typeof CATEGORY_ERROR_CODE[keyof typeof CATEGORY_ERROR_CODE];
