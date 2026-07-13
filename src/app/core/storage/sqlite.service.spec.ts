import { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { SQLiteService } from './sqlite.service';

describe('SQLiteService', () => {
  it('clears a failed initialization so startup retry opens the database again', async () => {
    const service = new SQLiteService();
    const database = {} as SQLiteDBConnection;
    const openDatabase = spyOn<any>(service, 'openDatabase').and.returnValues(
      Promise.reject(new Error('startup-failed')),
      Promise.resolve(database),
    );

    await expectAsync(service.initialize()).toBeRejectedWithError('startup-failed');
    await expectAsync(service.initialize()).toBeResolvedTo(database);

    expect(openDatabase).toHaveBeenCalledTimes(2);
  });
});
