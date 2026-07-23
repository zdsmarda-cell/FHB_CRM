import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

// 1. Add storageTypes to useStore
content = content.replace(
  'const { leadSources, ecommercePlatforms, itIntegrations, updateDeal, currentUser, users } = useStore();',
  'const { leadSources, ecommercePlatforms, storageTypes, itIntegrations, updateDeal, currentUser, users } = useStore();'
);

// 2. Add to formData state
content = content.replace(
  'ecommercePlatformId: deal.ecommercePlatformId,',
  `ecommercePlatformId: deal.ecommercePlatformId,
    storageTypeId: deal.storageTypeId,
    estimatedYearlyParcels: deal.estimatedYearlyParcels,
    seasonMonths: deal.seasonMonths || [],
    skuCount: deal.skuCount,
    productsSold: deal.productsSold,
    codUsage: deal.codUsage || [],
    b2cShare: deal.b2cShare ?? 50,`
);

content = content.replace(
  'ecommercePlatformId: deal.ecommercePlatformId,',
  `ecommercePlatformId: deal.ecommercePlatformId,
      storageTypeId: deal.storageTypeId,
      estimatedYearlyParcels: deal.estimatedYearlyParcels,
      seasonMonths: deal.seasonMonths || [],
      skuCount: deal.skuCount,
      productsSold: deal.productsSold,
      codUsage: deal.codUsage || [],
      b2cShare: deal.b2cShare ?? 50,`
);

// 3. Add strings/errors for new fields
content = content.replace(
  'const [parcelsStr, setParcelsStr] = useState<string>(deal.estimatedMonthlyParcels?.toString() || \'\');',
  `const [parcelsStr, setParcelsStr] = useState<string>(deal.estimatedMonthlyParcels?.toString() || '');
  const [yearlyParcelsStr, setYearlyParcelsStr] = useState<string>(deal.estimatedYearlyParcels?.toString() || '');
  const [skuCountStr, setSkuCountStr] = useState<string>(deal.skuCount?.toString() || '');
  const [skuCountError, setSkuCountError] = useState<boolean>(false);`
);

content = content.replace(
  'setParcelsStr(deal.estimatedMonthlyParcels?.toString() || \'\');',
  `setParcelsStr(deal.estimatedMonthlyParcels?.toString() || '');
    setYearlyParcelsStr(deal.estimatedYearlyParcels?.toString() || '');
    setSkuCountStr(deal.skuCount?.toString() || '');
    setSkuCountError(false);`
);

// 4. Update save function
content = content.replace(
  'estimatedMonthlyParcels: Number(parcelsStr),',
  `estimatedMonthlyParcels: Number(parcelsStr),
        estimatedYearlyParcels: yearlyParcelsStr ? Number(yearlyParcelsStr) : undefined,
        storageTypeId: formData.storageTypeId,
        seasonMonths: formData.seasonMonths,
        skuCount: skuCountStr ? Number(skuCountStr) : undefined,
        productsSold: formData.productsSold,
        codUsage: formData.codUsage,
        b2cShare: formData.b2cShare,`
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
