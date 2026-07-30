import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

// 1. Add yearlyParcelsError state
const stateTarget = `  const [skuCountError, setSkuCountError] = useState<boolean>(false);`;
const stateReplacement = `  const [skuCountError, setSkuCountError] = useState<boolean>(false);\n  const [yearlyParcelsError, setYearlyParcelsError] = useState<boolean>(false);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Add validation in handleSave
const handleSaveTarget = `    if (parcelsStr) {
      const num = Number(parcelsStr);
      if (!Number.isInteger(num) || num <= 0) {
        setParcelsError(true);
        return;
      }
    }`;
const handleSaveReplacement = `    if (parcelsStr) {
      const num = Number(parcelsStr);
      if (!Number.isInteger(num) || num <= 0) {
        setParcelsError(true);
        return;
      }
    }
    
    if (yearlyParcelsStr) {
      const num = Number(yearlyParcelsStr);
      if (!Number.isInteger(num) || num <= 0) {
        setYearlyParcelsError(true);
        return;
      }
    }
    
    if (skuCountStr) {
      const num = Number(skuCountStr);
      if (!Number.isInteger(num) || num <= 0) {
        setSkuCountError(true);
        return;
      }
    }`;
content = content.replace(handleSaveTarget, handleSaveReplacement);

// 3. Add to updateDeal payload
const payloadTarget = `      ...formData,
      estimatedMonthlyParcels: parcelsStr ? Number(parcelsStr) : undefined,
      averageItemsPerOrder: itemsStr ? Number(itemsStr) : undefined,
      averageParcelWeight: weightStr ? Number(weightStr) : undefined,
      averageParcelVolume: volumeStr ? Number(volumeStr) : undefined,
      stage: nextStage`;
const payloadReplacement = `      ...formData,
      estimatedMonthlyParcels: parcelsStr ? Number(parcelsStr) : undefined,
      estimatedYearlyParcels: yearlyParcelsStr ? Number(yearlyParcelsStr) : undefined,
      skuCount: skuCountStr ? Number(skuCountStr) : undefined,
      averageItemsPerOrder: itemsStr ? Number(itemsStr) : undefined,
      averageParcelWeight: weightStr ? Number(weightStr) : undefined,
      averageParcelVolume: volumeStr ? Number(volumeStr) : undefined,
      stage: nextStage`;
content = content.replace(payloadTarget, payloadReplacement);

// 4. Update the yearlyParcels input to show error
const inputTarget = `          <div>
            <label className="block text-gray-500 mb-1">{t('deal.attributes.estimatedYearlyParcels', 'Odhadovaný počet balíků ročně')}</label>
            <input 
              type="text"
              value={yearlyParcelsStr} 
              onChange={e => setYearlyParcelsStr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            />
          </div>`;
const inputReplacement = `          <div>
            <label className="block text-gray-500 mb-1">{t('deal.attributes.estimatedYearlyParcels', 'Odhadovaný počet balíků ročně')}</label>
            <input 
              type="text"
              value={yearlyParcelsStr} 
              onChange={e => {
                setYearlyParcelsStr(e.target.value);
                const num = Number(e.target.value);
                if (e.target.value && (!Number.isInteger(num) || num <= 0)) {
                  setYearlyParcelsError(true);
                } else {
                  setYearlyParcelsError(false);
                }
              }}
              className={'w-full px-3 py-2 border rounded outline-none transition-colors ' + (yearlyParcelsError ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600' : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500')}
            />
            {yearlyParcelsError && (
              <p className="mt-1 text-xs text-red-600">{t('deal.attributes.enterValidInteger')}</p>
            )}
          </div>`;
content = content.replace(inputTarget, inputReplacement);

// 5. Check if it correctly resets error when editing
const handleEditTarget = `    setSkuCountError(false);
    setParcelsError(false);`;
const handleEditReplacement = `    setSkuCountError(false);
    setParcelsError(false);
    setYearlyParcelsError(false);`;
content = content.replace(handleEditTarget, handleEditReplacement);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
console.log('done');
