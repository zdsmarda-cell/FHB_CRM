import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

const b2cShareField = `
          <div>
            <label className="block text-gray-500 mb-1">Podíl B2B vs B2C</label>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">B2B ({(100 - (formData.b2cShare ?? 50))}%)</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={formData.b2cShare ?? 50} 
                onChange={e => setFormData({ ...formData, b2cShare: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-700">B2C ({formData.b2cShare ?? 50}%)</span>
            </div>
          </div>
`;

content = content.replace(
  '          {showCloserAttributes && (\\n            <>\\n              <div>\\n                <label className="block text-gray-500 mb-1">{t(\\\'deal.attributes.deliveryCountries\\\')}</label>',
  b2cShareField + '\\n          {showCloserAttributes && (\\n            <>\\n              <div>\\n                <label className="block text-gray-500 mb-1">{t(\\\'deal.attributes.deliveryCountries\\\')}</label>'
);

const codUsageField = `
          <div>
            <label className="block text-gray-500 mb-1">Používání COD (vyberte zemi a procento)</label>
            <div className="space-y-2 mb-2">
              {(formData.codUsage || []).map((cu, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="font-semibold text-gray-700 w-12">{cu.countryCode}</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={cu.percentage} 
                    onChange={e => {
                      const newCod = [...(formData.codUsage || [])];
                      newCod[idx].percentage = Number(e.target.value);
                      setFormData({ ...formData, codUsage: newCod });
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  /> %
                  <button type="button" onClick={() => {
                    const newCod = [...(formData.codUsage || [])];
                    newCod.splice(idx, 1);
                    setFormData({ ...formData, codUsage: newCod });
                  }} className="text-red-500 hover:text-red-700 text-sm ml-2">Odebrat</button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
               <select id="cod_country_select" className="w-1/2 px-3 py-2 border border-gray-300 rounded text-sm bg-white">
                 <option value="">-- Vyberte zemi --</option>
                 <option value="CZ">CZ</option>
                 <option value="SK">SK</option>
                 <option value="PL">PL</option>
                 <option value="HU">HU</option>
                 <option value="RO">RO</option>
                 <option value="DE">DE</option>
                 <option value="AT">AT</option>
               </select>
               <button type="button" onClick={() => {
                 const select = document.getElementById('cod_country_select') as HTMLSelectElement;
                 if (select && select.value) {
                   if (!(formData.codUsage || []).some(c => c.countryCode === select.value)) {
                     setFormData({ ...formData, codUsage: [...(formData.codUsage || []), { countryCode: select.value, percentage: 1 }] });
                   }
                   select.value = '';
                 }
               }} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-sm font-medium">Přidat</button>
            </div>
          </div>
`;

content = content.replace(
  '              </div>\\n              <div>\\n                <label className="block text-gray-500 mb-1">{t(\\\'deal.attributes.averageItems\\\')}</label>',
  '              </div>\\n' + codUsageField + '\\n              <div>\\n                <label className="block text-gray-500 mb-1">{t(\\\'deal.attributes.averageItems\\\')}</label>'
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
