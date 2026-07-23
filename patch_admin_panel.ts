import fs from 'fs';

let content = fs.readFileSync('src/components/views/AdminPanel.tsx', 'utf8');

// 1. Add state for newStorageType
content = content.replace(
  "const [newEcommercePlatform, setNewEcommercePlatform] = useState('');",
  "const [newEcommercePlatform, setNewEcommercePlatform] = useState('');\n  const [newStorageType, setNewStorageType] = useState('');"
);

// 2. Add block for storageTypes
const storageTypeAdmin = `
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stávající skladování</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newStorageType}
              onChange={e => setNewStorageType(e.target.value)}
              placeholder="Nový typ skladování"
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              onKeyPress={e => {
                if (e.key === 'Enter' && newStorageType.trim()) {
                  store.addStorageType(newStorageType.trim());
                  setNewStorageType('');
                }
              }}
            />
            <button 
              onClick={() => {
                if (newStorageType.trim()) {
                  store.addStorageType(newStorageType.trim());
                  setNewStorageType('');
                }
              }}
              disabled={!newStorageType.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {t('common.add')}
            </button>
          </div>
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {store.storageTypes.map(st => (
              <EditableListItem 
                key={st.id} 
                item={st} 
                onUpdateName={(name) => store.updateStorageType(st.id, { name })}
                onToggleActive={() => store.updateStorageType(st.id, { isActive: !st.isActive })}
                onDelete={() => store.deleteStorageType(st.id).catch(err => alert(err.message))}
              />
            ))}
            {store.storageTypes.length === 0 && (
              <li className="py-3 text-sm text-gray-500">Žádné typy skladování</li>
            )}
          </ul>
        </div>
`;

content = content.replace(
  '        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">{t(\'admin.itIntegrations\')}</h3>',
  storageTypeAdmin + '\n        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">\n          <h3 className="text-lg font-medium text-gray-900 mb-4">{t(\'admin.itIntegrations\')}</h3>'
);

fs.writeFileSync('src/components/views/AdminPanel.tsx', content);
