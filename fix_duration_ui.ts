import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

const durationInputStr = `
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.duration', 'Délka trvání (min)')}</label>
              <input 
                type="number"
                min="1"
                max="1440"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>`;

content = content.replace(
  /<div>\s*<label className="block text-xs font-medium text-gray-700 mb-1">\{t\('activities\.dateTime', 'Datum a čas'\)\}<\/label>/,
  durationInputStr + "\n            <div>\n              <label className=\"block text-xs font-medium text-gray-700 mb-1\">{t('activities.dateTime', 'Datum a čas')}</label>"
);

content = content.replace(
  /<div className="grid grid-cols-2 gap-4">/,
  '<div className="grid grid-cols-3 gap-4">'
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
