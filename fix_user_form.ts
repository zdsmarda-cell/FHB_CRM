import fs from 'fs';

let content = fs.readFileSync('src/components/modals/UserForm.tsx', 'utf8');

content = content.replace(
  /isTestAccount: formData\.isTestAccount,\n\s*isTestAccount: formData\.isTestAccount,/,
  "isTestAccount: formData.isTestAccount,"
);

if (!content.includes('isActive: formData.isActive,\n          isTestAccount: formData.isTestAccount,\n          passwordHash:')) {
  content = content.replace(
    /isActive: formData\.isActive,\n\s*passwordHash: hashPassword/,
    "isActive: formData.isActive,\n          isTestAccount: formData.isTestAccount,\n          passwordHash: hashPassword"
  );
}

fs.writeFileSync('src/components/modals/UserForm.tsx', content);
