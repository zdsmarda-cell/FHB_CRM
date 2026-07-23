import fs from 'fs';

let content = fs.readFileSync('src/components/views/AdminPanel.tsx', 'utf8');

if (!content.includes('const [newStorageType')) {
  content = content.replace(
    "const [newEcommercePlatform, setNewEcommercePlatform] = useState('');",
    "const [newEcommercePlatform, setNewEcommercePlatform] = useState('');\n  const [newStorageType, setNewStorageType] = useState('');"
  );
}

const storageTypesBlock = `          {/* Storage Types */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Stávající skladování</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStorageType}
                onChange={e => setNewStorageType(e.target.value)}
                placeholder="Nový typ skladování"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
            <ul className="divide-y divide-gray-100">
              {store.storageTypes.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateStorageType(s.id, { name })}
                  onToggleActive={() => store.updateStorageType(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteStorageType(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.deals.some(d => d.storageTypeId === s.id)}
                />
              ))}
              {store.storageTypes.length === 0 && (
                <li className="py-3 text-sm text-gray-500">Žádné typy skladování</li>
              )}
            </ul>
          </div>
`;

if (!content.includes('Stávající skladování')) {
  content = content.replace(
    "{/* IT Integrations */}",
    storageTypesBlock + "\n          {/* IT Integrations */}"
  );
}

fs.writeFileSync('src/components/views/AdminPanel.tsx', content);
