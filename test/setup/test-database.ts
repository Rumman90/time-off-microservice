import * as fs from 'fs';

export function resetTestDatabase() {
  process.env.DATABASE_PATH = 'test.sqlite';

  if (fs.existsSync('test.sqlite')) {
    fs.unlinkSync('test.sqlite');
  }
}
