import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

// Add stName definition
content = content.replace(
  "const ecName = ecommercePlatforms.find(s => s.id === deal.ecommercePlatformId)?.name || '-';",
  "const ecName = ecommercePlatforms.find(s => s.id === deal.ecommercePlatformId)?.name || '-';\n  const stName = storageTypes.find(s => s.id === deal.storageTypeId)?.name || '-';"
);

// Add read-only display fields
const viewFields = `
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Stávající skladování</span>
            <span className="text-gray-900 font-medium">{stName}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Odhadovaný počet balíků (měsíčně / ročně)</span>
            <span className="text-gray-900 font-medium">{deal.estimatedMonthlyParcels || '-'} / {deal.estimatedYearlyParcels || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Měsíce sezóny</span>
            <span className="text-gray-900 font-medium">{deal.seasonMonths?.join(', ') || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Celkový počet SKU</span>
            <span className="text-gray-900 font-medium">{deal.skuCount || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Produkty, které zákazník prodává</span>
            <span className="text-gray-900 font-medium">{deal.productsSold || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Podíl B2B vs B2C</span>
            <span className="text-gray-900 font-medium">B2B: {100 - (deal.b2cShare ?? 50)}% / B2C: {deal.b2cShare ?? 50}%</span>
          </div>
`;

content = content.replace(
  '          <div>\n            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t(\'deal.attributes.estimatedParcels\')}</span>\n            <span className="text-gray-900 font-medium">{deal.estimatedMonthlyParcels || \'-\'}</span>\n          </div>',
  viewFields
);

const viewCodUsage = `
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Používání COD</span>
            <span className="text-gray-900 font-medium">
              {deal.codUsage && deal.codUsage.length > 0 ? deal.codUsage.map(c => \`\${c.countryCode} (\${c.percentage}%)\`).join(', ') : '-'}
            </span>
          </div>
`;

content = content.replace(
  '            <span className="text-gray-900 font-medium">{deal.deliveryCountries?.join(\', \') || \'-\'}</span>\n          </div>',
  '            <span className="text-gray-900 font-medium">{deal.deliveryCountries?.join(\', \') || \'-\'}</span>\n          </div>\n' + viewCodUsage
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
