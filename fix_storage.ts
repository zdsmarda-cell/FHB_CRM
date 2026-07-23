import fs from 'fs';

let content = fs.readFileSync('src/store.ts', 'utf8');

content = content.replace(
  'addStorageType: async (name) => {\n      const newType = { id: uuidv4(), name, isActive: true };\n      await syncToDb({ storage_types: [newType] });',
  'addStorageType: async (name) => {\n      const newType = { id: uuidv4(), name, isActive: true };\n      await syncToDb({ storage_types: [{ ...newType, isVisible: newType.isActive, isActive: undefined }] });'
);

content = content.replace(
  'updateStorageType: async (id, updates) => {\n      const state = get();\n      const existing = state.storageTypes.find(p => p.id === id);\n      if (!existing) return;\n      const updated = { ...existing, ...updates };\n      await syncToDb({ storage_types: [updated] });',
  'updateStorageType: async (id, updates) => {\n      const state = get();\n      const existing = state.storageTypes.find(p => p.id === id);\n      if (!existing) return;\n      const updated = { ...existing, ...updates };\n      const dbUpdated = { ...updated, isVisible: updated.isActive, isActive: undefined };\n      await syncToDb({ storage_types: [dbUpdated] });'
);

fs.writeFileSync('src/store.ts', content);
console.log('done');
