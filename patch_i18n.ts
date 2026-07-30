import fs from 'fs';

let content = fs.readFileSync('src/i18n.ts', 'utf8');

// English kanban
const enTarget = "missingHunter: 'First you must assign a hunter before moving to the next stage.',";
const enReplacement = "missingHunter: 'First you must assign a hunter before moving to the next stage.',\n          missingIco: 'First you must fill in the Company ID (IČ) before moving to the next stage.',\n          missingActivity: 'First you must have at least one past activity (call, teams, meeting) before moving to the next stage.',";

content = content.replace(enTarget, enReplacement);

// Czech kanban
const csTarget = "missingHunter: 'Prvně musíte přiřadit huntera (hunter), než můžete posunout do dalšího stavu.',";
const csReplacement = "missingHunter: 'Prvně musíte přiřadit huntera (hunter), než můžete posunout do dalšího stavu.',\n          missingIco: 'Před posunem z příležitosti musí být vyplněno IČ (IČO) společnosti.',\n          missingActivity: 'Před posunem z příležitosti musí být v historii alespoň jedna proběhlá (v minulosti) aktivita typu telefon, teams nebo osobní návštěva.',";

content = content.replace(csTarget, csReplacement);

fs.writeFileSync('src/i18n.ts', content);
console.log('done i18n');
