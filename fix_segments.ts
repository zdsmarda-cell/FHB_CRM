import fs from 'fs';

let content = fs.readFileSync('src/store.ts', 'utf8');

content = content.replace(
  'leadSources: data.leadSources || [],\n          ecommercePlatforms:',
  'leadSources: data.leadSources || [],\n          segments: data.segments || [],\n          ecommercePlatforms:'
);

fs.writeFileSync('src/store.ts', content);
