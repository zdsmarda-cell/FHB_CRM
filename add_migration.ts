import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const migrationsEnd = content.indexOf('];', content.indexOf('const migrations = ['));
content = content.slice(0, migrationsEnd) + '        "ALTER TABLE storage_types CHANGE isVisible isActive BOOLEAN DEFAULT TRUE;",\n      ' + content.slice(migrationsEnd);

fs.writeFileSync('server.ts', content);
