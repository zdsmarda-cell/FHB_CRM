import fs from 'fs';

let content = fs.readFileSync('src/store.ts', 'utf8');

content = content.replace(
  'ecommercePlatforms: data.ecommercePlatforms || [],\n          itIntegrations: data.itIntegrations || [],',
  'ecommercePlatforms: data.ecommercePlatforms || [],\n          storageTypes: (data.storageTypes || []).map((s: any) => ({ ...s, isActive: s.isVisible })),\n          itIntegrations: data.itIntegrations || [],'
);

content = content.replace(
  'ecommercePlatforms: data.ecommercePlatforms || [],\n            itIntegrations: data.itIntegrations || [],',
  'ecommercePlatforms: data.ecommercePlatforms || [],\n            storageTypes: (data.storageTypes || []).map((s: any) => ({ ...s, isActive: s.isVisible })),\n            itIntegrations: data.itIntegrations || [],'
);

fs.writeFileSync('src/store.ts', content);
console.log('done');
