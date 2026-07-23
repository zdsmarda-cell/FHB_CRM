import fs from 'fs';

let content = fs.readFileSync('src/i18n.ts', 'utf8');

const enAdd = `        notes: 'Notes',
        newNote: 'New note...',
        edited: '(Edited)',`;

content = content.replace("notes: 'Notes',", enAdd);

const csAdd = `        notes: 'Poznámky',
        newNote: 'Nová poznámka...',
        edited: '(Upraveno)',`;

content = content.replace("notes: 'Poznámky',", csAdd);

fs.writeFileSync('src/i18n.ts', content);
