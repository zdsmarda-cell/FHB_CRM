import fs from 'fs';

let content = fs.readFileSync('schema.sql', 'utf8');
content = content.replace('isVisible BOOLEAN DEFAULT TRUE', 'isActive BOOLEAN DEFAULT TRUE');
content = content.replace('INSERT IGNORE INTO storage_types (id, name, isVisible) VALUES (\\'own\\', \\'Vlastní sklad\\', TRUE), (\\'fulfillment\\', \\'Pronajatý sklad (fulfillment)\\', TRUE);', 'INSERT IGNORE INTO storage_types (id, name, isActive) VALUES (\\'own\\', \\'Vlastní sklad\\', TRUE), (\\'fulfillment\\', \\'Pronajatý sklad (fulfillment)\\', TRUE);');
fs.writeFileSync('schema.sql', content);

let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace('export interface StorageType {\\n  id: string;\\n  name: string;\\n  isVisible: boolean;\\n}', 'export interface StorageType {\\n  id: string;\\n  name: string;\\n  isActive: boolean;\\n}');
fs.writeFileSync('src/types.ts', types);
