import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

content = content.replace(
  /setFormData\(\{\s*leadSourceId: deal\.leadSourceId,\s*ecommercePlatformId: deal\.ecommercePlatformId,\s*deliveryCountries: deal\.deliveryCountries \|\| \[\],\s*averageItemsPerOrder: deal\.averageItemsPerOrder,\s*averageParcelWeight: deal\.averageParcelWeight,\s*averageParcelVolume: deal\.averageParcelVolume,\s*contractSignedDate: deal\.contractSignedDate,\s*pricingUploadedDate: deal\.pricingUploadedDate,\s*itIntegrationId: deal\.itIntegrationId,\s*firstStockingDate: deal\.firstStockingDate,\s*itIntegrationCompletedDate: deal\.itIntegrationCompletedDate,\s*firstStockingDateActual: deal\.firstStockingDateActual,\s*integrationTestingCompletedDate: deal\.integrationTestingCompletedDate\s*\}\);/g,
  `setFormData({
      leadSourceId: deal.leadSourceId,
      ecommercePlatformId: deal.ecommercePlatformId,
      storageTypeId: deal.storageTypeId,
      estimatedYearlyParcels: deal.estimatedYearlyParcels,
      seasonMonths: deal.seasonMonths || [],
      skuCount: deal.skuCount,
      productsSold: deal.productsSold,
      codUsage: deal.codUsage || [],
      b2cShare: deal.b2cShare ?? 50,
      deliveryCountries: deal.deliveryCountries || [],
      averageItemsPerOrder: deal.averageItemsPerOrder,
      averageParcelWeight: deal.averageParcelWeight,
      averageParcelVolume: deal.averageParcelVolume,
      contractSignedDate: deal.contractSignedDate,
      pricingUploadedDate: deal.pricingUploadedDate,
      itIntegrationId: deal.itIntegrationId,
      firstStockingDate: deal.firstStockingDate,
      itIntegrationCompletedDate: deal.itIntegrationCompletedDate,
      firstStockingDateActual: deal.firstStockingDateActual,
      integrationTestingCompletedDate: deal.integrationTestingCompletedDate
    });`
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
