import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add storageTypes query
if (!content.includes('const [storageTypes] = await pool.query(\'SELECT * FROM storage_types\');')) {
  content = content.replace(
    "const [ecommercePlatforms] = await pool.query('SELECT * FROM ecommerce_platforms');",
    "const [ecommercePlatforms] = await pool.query('SELECT * FROM ecommerce_platforms');\n      const [storageTypes] = await pool.query('SELECT * FROM storage_types');"
  );
}

// 2. Add storageTypes to JSON response
if (!content.includes('storageTypes: parseJsonFields(storageTypes as any[], []),')) {
  content = content.replace(
    'ecommercePlatforms: parseJsonFields(ecommercePlatforms as any[], []),',
    'ecommercePlatforms: parseJsonFields(ecommercePlatforms as any[], []),\n        storageTypes: parseJsonFields(storageTypes as any[], []),'
  );
}

// 3. Add JSON fields to deals
if (content.includes("['deliveryCountries', 'pricingOffers', 'documents', 'notes']")) {
  content = content.replace(
    "['deliveryCountries', 'pricingOffers', 'documents', 'notes']",
    "['deliveryCountries', 'pricingOffers', 'documents', 'notes', 'seasonMonths', 'codUsage']"
  );
} else if (content.includes("['deliveryCountries', 'pricingOffers', 'documents', 'notes', 'seasonMonths', 'codUsage']")) {
  // Already replaced
}

fs.writeFileSync('server.ts', content);
