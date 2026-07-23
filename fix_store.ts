import fs from 'fs';

let content = fs.readFileSync('src/store.ts', 'utf8');

// I will just replace the naive versions I injected with proper ones hitting syncToDb
content = content.replace(
  `addEcommercePlatform: (platform) => { set((state) => ({ ecommercePlatforms: [...state.ecommercePlatforms, platform], })); },
  addStorageType: (storageType) => { set((state) => ({ storageTypes: [...state.storageTypes, storageType], })); },
  updateStorageType: (id, updates) => { set((state) => ({ storageTypes: state.storageTypes.map(s => s.id === id ? { ...s, ...updates } : s) })); },
  deleteStorageType: (id) => { set((state) => ({ storageTypes: state.storageTypes.filter(s => s.id !== id) })); },`,
  `addEcommercePlatform: async (name) => {
      const newPlatform = { id: uuidv4(), name, isActive: true };
      await syncToDb({ ecommerce_platforms: [newPlatform] });
      set(state => ({ ecommercePlatforms: [...state.ecommercePlatforms, newPlatform] }));
    },
    updateEcommercePlatform: async (id, updates) => {
      const state = get();
      const existing = state.ecommercePlatforms.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await syncToDb({ ecommerce_platforms: [updated] });
      set(state => ({ ecommercePlatforms: state.ecommercePlatforms.map(p => p.id === id ? updated : p) }));
    },
    deleteEcommercePlatform: async (id) => {
      set(state => ({ ecommercePlatforms: state.ecommercePlatforms.filter(p => p.id !== id) }));
      await deleteFromDb('ecommerce_platforms', id);
    },
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
      set(state => ({ storageTypes: state.storageTypes.filter(p => p.id !== id) }));
      await deleteFromDb('storage_types', id);
    },`
);

fs.writeFileSync('src/store.ts', content);
