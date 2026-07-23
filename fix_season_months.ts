import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

const target = `          <div>
            <label className="block text-gray-500 mb-1">Měsíce sezóny</label>
            <select 
              multiple
              value={formData.seasonMonths || []}
              onChange={e => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, seasonMonths: values });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-32"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Podržte Ctrl (nebo Cmd) pro výběr více možností.</p>
          </div>`;

const replacement = `          <div>
            <label className="block text-gray-500 mb-1">Měsíce sezóny</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.seasonMonths || []).map((month, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                  <span>{month}</span>
                  <button type="button" onClick={() => {
                    const newMonths = [...(formData.seasonMonths || [])];
                    newMonths.splice(idx, 1);
                    setFormData({ ...formData, seasonMonths: newMonths });
                  }} className="text-indigo-400 hover:text-indigo-600 focus:outline-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
               <select id="season_month_select" className="w-1/2 px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors">
                 <option value="">-- Vyberte měsíc --</option>
                 {['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'].map(m => (
                   <option key={m} value={m}>{m}</option>
                 ))}
               </select>
               <button type="button" onClick={() => {
                 const select = document.getElementById('season_month_select') as HTMLSelectElement;
                 if (select && select.value) {
                   if (!(formData.seasonMonths || []).includes(select.value)) {
                     setFormData({ ...formData, seasonMonths: [...(formData.seasonMonths || []), select.value] });
                   }
                   select.value = '';
                 }
               }} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-sm font-medium transition-colors">Přidat</button>
            </div>
          </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
    console.log('Done');
} else {
    console.log('Target not found');
}
