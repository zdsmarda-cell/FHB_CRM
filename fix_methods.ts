import fs from 'fs';

let types = fs.readFileSync('src/types.ts', 'utf8');
if (!types.includes('addStorageType:')) {
  types = types.replace(
    'addEcommercePlatform: (name: string) => Promise<void>;',
    'addEcommercePlatform: (name: string) => Promise<void>;\n  updateStorageType: (id: string, updates: Partial<StorageType>) => Promise<void>;\n  addStorageType: (name: string) => Promise<void>;\n  deleteStorageType: (id: string) => Promise<void>;'
  );
  fs.writeFileSync('src/types.ts', types);
}

let store = fs.readFileSync('src/store.ts', 'utf8');
if (!store.includes('addStorageType: async (name) => {')) {
  const methods = `
    addStorageType: async (name) => {
      const newType = { id: uuidv4(), name, isActive: true };
      await syncToDb({ storage_types: [newType] });
      set(state => ({ storageTypes: [...state.storageTypes, newType] }));
    },
    updateStorageType: async (id, updates) => {
      const state = get();
      const existing = state.storageTypes.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await syncToDb({ storage_types: [updated] });
      set(state => ({ storageTypes: state.storageTypes.map(p => p.id === id ? updated : p) }));
    },
    deleteStorageType: async (id) => {
      await apiFetch('/api/delete-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'storage_types', id })
      }).then(async (res) => {
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || 'Failed to delete');
        }
      });
      set(state => ({
        storageTypes: state.storageTypes.filter(s => s.id !== id)
      }));
    },`;
  store = store.replace(
    "deleteEcommercePlatform: async (id) => {",
    methods + "\n    deleteEcommercePlatform: async (id) => {"
  );
  fs.writeFileSync('src/store.ts', store);
}

console.log('done');
