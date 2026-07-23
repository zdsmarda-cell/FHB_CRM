import fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');

const newMigrations = `
        "ALTER TABLE deals ADD COLUMN storageTypeId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN estimatedYearlyParcels INT;",
        "ALTER TABLE deals ADD COLUMN seasonMonths JSON;",
        "ALTER TABLE deals ADD COLUMN skuCount INT;",
        "ALTER TABLE deals ADD COLUMN productsSold TEXT;",
        "ALTER TABLE deals ADD COLUMN codUsage JSON;",
        "ALTER TABLE deals ADD COLUMN b2cShare INT;",
`;

if (!serverTs.includes('storageTypeId')) {
    serverTs = serverTs.replace(
        '"ALTER TABLE activities ADD COLUMN duration INT;",',
        '"ALTER TABLE activities ADD COLUMN duration INT;",' + newMigrations
    );
    fs.writeFileSync('server.ts', serverTs);
}
