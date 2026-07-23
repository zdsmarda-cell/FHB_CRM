import fs from 'fs';

let content = fs.readFileSync('src/store.ts', 'utf8');

content = content.replace(
  'storageTypes: (data.storageTypes || []).map((s: any) => ({ ...s, isActive: s.isVisible })),',
  'storageTypes: data.storageTypes || [],'
);
content = content.replace(
  'storageTypes: (data.storageTypes || []).map((s: any) => ({ ...s, isActive: s.isVisible })),',
  'storageTypes: data.storageTypes || [],'
);
content = content.replace(
  'await syncToDb({ storage_types: [{ ...newType, isVisible: newType.isActive, isActive: undefined }] });',
  'await syncToDb({ storage_types: [newType] });'
);
content = content.replace(
  'const dbUpdated = { ...updated, isVisible: updated.isActive, isActive: undefined };\n      await syncToDb({ storage_types: [dbUpdated] });',
  'await syncToDb({ storage_types: [updated] });'
);

fs.writeFileSync('src/store.ts', content);
