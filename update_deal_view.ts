import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

content = content.replace(
  "const [activityType, setActivityType] = useState<ActivityType>('meeting');",
  "const [activityType, setActivityType] = useState<ActivityType>('meeting');\n  const [duration, setDuration] = useState<number>(60);"
);

content = content.replace(
  /setActivityType\(activity\.type\);/,
  "setActivityType(activity.type);\n    setDuration(activity.duration || (activity.type === 'call' ? 15 : (activity.type === 'teams' || activity.type === 'meeting' ? 60 : 60)));"
);

content = content.replace(
  /setActivityType\('meeting'\);/,
  "setActivityType('meeting');\n    setDuration(60);"
);

content = content.replace(
  /externalEventId\n\s*\}\)/g,
  "externalEventId,\n        duration\n      })"
);

content = content.replace(
  /attendees,\n\s*externalEventId\n\s*\}/g,
  "attendees,\n              externalEventId,\n              duration\n            }"
);

content = content.replace(
  /onChange=\{\(e\) => setActivityType\(e.target.value as ActivityType\)\}/,
  `onChange={(e) => {
                  const newType = e.target.value as ActivityType;
                  setActivityType(newType);
                  if (newType === 'call') setDuration(15);
                  else if (newType === 'teams' || newType === 'meeting') setDuration(60);
                }}`
);

const durationInputStr = `
            </div>
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
            </div>
`;

content = content.replace(
  /<div className="grid grid-cols-2 gap-4">\s*<div>\s*<label className="block text-xs font-medium text-gray-700 mb-1">\{t\('activities\.activityType'[^}]*\}\}<\/label>/,
  '<div className="grid grid-cols-3 gap-4">\n            <div>\n              <label className="block text-xs font-medium text-gray-700 mb-1">{t(\'activities.activityType\', \'Typ aktivity\')}</label>'
);

content = content.replace(
  /<\/select>\s*<\/div>\s*<div>\s*<label className="block text-xs font-medium text-gray-700 mb-1">\{t\('activities\.dateTime'[^}]*\}\}<\/label>/,
  `</select>\n            </div>${durationInputStr}\n            <div>\n              <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.dateTime', 'Datum a čas')}</label>`
);

content = content.replace(
  /if \(\(activityType === 'teams' \|\| activityType === 'meeting'\) &&/,
  "if ((activityType === 'teams' || activityType === 'meeting' || activityType === 'call') &&"
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
