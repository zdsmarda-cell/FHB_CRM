import fs from 'fs';

let content = fs.readFileSync('src/store.ts', 'utf8');

if (!content.includes('storageTypes: []')) {
  content = content.replace(
    'ecommercePlatforms: [],',
    'ecommercePlatforms: [],\n  storageTypes: [],'
  );
}

if (!content.includes('addStorageType:')) {
  content = content.replace(
    /addEcommercePlatform:\s*\(\s*platform\s*\)\s*=>\s*\{\s*set\(\(\s*state\s*\)\s*=>\s*\(\{\s*ecommercePlatforms:\s*\[\.\.\.state\.ecommercePlatforms,\s*platform\],\s*\}\)\);\s*\},/,
    `addEcommercePlatform: (platform) => { set((state) => ({ ecommercePlatforms: [...state.ecommercePlatforms, platform], })); },
  addStorageType: (storageType) => { set((state) => ({ storageTypes: [...state.storageTypes, storageType], })); },
  updateStorageType: (id, updates) => { set((state) => ({ storageTypes: state.storageTypes.map(s => s.id === id ? { ...s, ...updates } : s) })); },
  deleteStorageType: (id) => { set((state) => ({ storageTypes: state.storageTypes.filter(s => s.id !== id) })); },`
  );
}

fs.writeFileSync('src/store.ts', content);
