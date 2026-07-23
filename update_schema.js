import fs from 'fs';

let schema = fs.readFileSync('schema.sql', 'utf8');

// Add storage_types table
if (!schema.includes('storage_types')) {
  const storageTypesSql = `
CREATE TABLE IF NOT EXISTS storage_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  isVisible BOOLEAN DEFAULT TRUE
);
INSERT IGNORE INTO storage_types (id, name, isVisible) VALUES ('own', 'Vlastní sklad', TRUE), ('fulfillment', 'Pronajatý sklad (fulfillment)', TRUE);
`;
  schema = schema.replace('CREATE TABLE IF NOT EXISTS deals', storageTypesSql + '\nCREATE TABLE IF NOT EXISTS deals');
}

// Add columns to deals
if (!schema.includes('storageTypeId')) {
  schema = schema.replace(
    'ecommercePlatformId VARCHAR(50),',
    'ecommercePlatformId VARCHAR(50),\n  storageTypeId VARCHAR(50),\n  estimatedYearlyParcels INT,\n  seasonMonths JSON,\n  skuCount INT,\n  productsSold TEXT,\n  codUsage JSON,\n  b2cShare INT,'
  );
}

fs.writeFileSync('schema.sql', schema);
console.log('schema.sql updated');
