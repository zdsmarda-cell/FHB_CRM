import fs from 'fs';

let content = fs.readFileSync('src/types.ts', 'utf8');

// Add StorageType interface if it doesn't exist
if (!content.includes('export interface StorageType')) {
  content = content.replace(
    'export interface EcommercePlatform {',
    'export interface StorageType {\n  id: string;\n  name: string;\n  isVisible: boolean;\n}\n\nexport interface EcommercePlatform {'
  );
}

// Add to Deal interface
if (!content.includes('storageTypeId?: string')) {
  content = content.replace(
    'ecommercePlatformId?: string;',
    `ecommercePlatformId?: string;
  storageTypeId?: string;
  estimatedYearlyParcels?: number;
  seasonMonths?: string[];
  skuCount?: number;
  productsSold?: string;
  codUsage?: { countryCode: string; percentage: number }[];
  b2cShare?: number;`
  );
}

// Add storageTypes to AppState
if (!content.includes('storageTypes: StorageType[];')) {
  content = content.replace(
    'ecommercePlatforms: EcommercePlatform[];',
    'ecommercePlatforms: EcommercePlatform[];\n  storageTypes: StorageType[];'
  );
}

fs.writeFileSync('src/types.ts', content);
