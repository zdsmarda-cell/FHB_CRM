import fs from 'fs';

let content = fs.readFileSync('src/components/modals/UserForm.tsx', 'utf8');

content = content.replace(
  /isActive: true,/,
  "isActive: true,\n    isTestAccount: false,"
);

content = content.replace(
  /isActive: userToEdit\.isActive,/,
  "isActive: userToEdit.isActive,\n        isTestAccount: userToEdit.isTestAccount || false,"
);

content = content.replace(
  /isActive: formData\.isActive,/,
  "isActive: formData.isActive,\n          isTestAccount: formData.isTestAccount,"
);
content = content.replace(
  /isActive: formData\.isActive,/,
  "isActive: formData.isActive,\n          isTestAccount: formData.isTestAccount,"
);

const testCheckbox = `
          <div className="flex items-center pt-2">
            <input 
              type="checkbox" 
              id="isTestAccount"
              checked={formData.isTestAccount} 
              onChange={e => setFormData({...formData, isTestAccount: e.target.checked})} 
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
            />
            <label htmlFor="isTestAccount" className="ml-2 block text-sm text-gray-900">
              {t('admin.isTestAccount', 'Testovací účet')}
            </label>
          </div>
`;

content = content.replace(
  /<div className="flex items-center pt-2">\s*<input/,
  testCheckbox + '\n          <div className="flex items-center pt-2">\n            <input'
);

fs.writeFileSync('src/components/modals/UserForm.tsx', content);
