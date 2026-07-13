import { Category } from './category.model';

describe('Category model', () => {
  it('represents a user-defined local grouping without remote account fields', () => {
    const category: Category = {
      id: 'category-1',
      name: 'Home',
      createdAt: '2026-07-09T20:00:00.000Z',
    };

    expect(category).toEqual({
      id: 'category-1',
      name: 'Home',
      createdAt: '2026-07-09T20:00:00.000Z',
    });
    expect('userId' in category).toBeFalse();
    expect('syncId' in category).toBeFalse();
  });
});
