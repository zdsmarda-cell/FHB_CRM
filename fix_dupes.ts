import fs from 'fs';
let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');
content = content.replace(
  `    storageTypeId: deal.storageTypeId,
      estimatedYearlyParcels: deal.estimatedYearlyParcels,
      seasonMonths: deal.seasonMonths || [],
      skuCount: deal.skuCount,
      productsSold: deal.productsSold,
      codUsage: deal.codUsage || [],
      b2cShare: deal.b2cShare ?? 50,`,
  ``
);
content = content.replace(
  `    storageTypeId: deal.storageTypeId,
      estimatedYearlyParcels: deal.estimatedYearlyParcels,
      seasonMonths: deal.seasonMonths || [],
      skuCount: deal.skuCount,
      productsSold: deal.productsSold,
      codUsage: deal.codUsage || [],
      b2cShare: deal.b2cShare ?? 50,`,
  ``
);
fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
