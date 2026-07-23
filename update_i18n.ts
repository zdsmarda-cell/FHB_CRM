import fs from 'fs';

let content = fs.readFileSync('src/i18n.ts', 'utf8');

const enCommonAdd = `      common: {
        save: 'Save',
        cancel: 'Cancel',
        add: 'Add',
        edit: 'Edit',
        stage: 'Stage',
        language: 'Language',
        user: 'Acting User',
        userFilter: 'Filter by user:',
        all: '-- All --',
        error: 'Error',
        notes: 'Notes',
        remove: 'Remove',
        noStorageTypes: 'No storage types',`;

content = content.replace(`      common: {
        save: 'Save',
        cancel: 'Cancel',
        add: 'Add',
        edit: 'Edit',
        stage: 'Stage',
        language: 'Language',
        user: 'Acting User',
        userFilter: 'Filter by user:',
        all: '-- All --',
        error: 'Error',`, enCommonAdd);

const csCommonAdd = `      common: {
        save: 'Uložit',
        cancel: 'Zrušit',
        add: 'Přidat',
        edit: 'Upravit',
        stage: 'Stav',
        language: 'Jazyk',
        user: 'Zastupující Uživatel',
        userFilter: 'Filtr dle uživatele:',
        all: '-- Všichni --',
        error: 'Chyba',
        notes: 'Poznámky',
        remove: 'Odebrat',
        noStorageTypes: 'Žádné typy skladování',`;

content = content.replace(`      common: {
        save: 'Uložit',
        cancel: 'Zrušit',
        add: 'Přidat',
        edit: 'Upravit',
        stage: 'Stav',
        language: 'Jazyk',
        user: 'Zastupující Uživatel',
        userFilter: 'Filtr dle uživatele:',
        all: '-- Všichni --',
        error: 'Chyba',`, csCommonAdd);

const enAttrAdd = `        attributes: {
          currentStorage: 'Current storage',
          estimatedYearlyParcels: 'Estimated yearly parcels',
          seasonMonths: 'Season months',
          totalSku: 'Total SKU',
          productsSold: 'Products sold',
          codUsage: 'COD usage',
          estimatedParcelsMonthlyYearly: 'Estimated parcels (monthly / yearly)',
          selectMonth: '-- Select month --',
          selectCountry: '-- Select country --',
          months: {
            january: 'January',
            february: 'February',
            march: 'March',
            april: 'April',
            may: 'May',
            june: 'June',
            july: 'July',
            august: 'August',
            september: 'September',
            october: 'October',
            november: 'November',
            december: 'December'
          },`;

content = content.replace(`        attributes: {`, enAttrAdd);

const csAttrAdd = `        attributes: {
          currentStorage: 'Stávající skladování',
          estimatedYearlyParcels: 'Odhadovaný počet balíků ročně',
          seasonMonths: 'Měsíce sezóny',
          totalSku: 'Celkový počet SKU',
          productsSold: 'Produkty, které zákazník prodává',
          codUsage: 'Používání COD',
          estimatedParcelsMonthlyYearly: 'Odhadovaný počet balíků (měsíčně / ročně)',
          selectMonth: '-- Vyberte měsíc --',
          selectCountry: '-- Vyberte zemi --',
          months: {
            january: 'Leden',
            february: 'Únor',
            march: 'Březen',
            april: 'Duben',
            may: 'Květen',
            june: 'Červen',
            july: 'Červenec',
            august: 'Srpen',
            september: 'Září',
            october: 'Říjen',
            november: 'Listopad',
            december: 'Prosinec'
          },`;
          
// Replace the second occurrence of "attributes: {"
let parts = content.split('        attributes: {');
content = parts[0] + parts[1] + csAttrAdd + parts[2];

fs.writeFileSync('src/i18n.ts', content);
console.log('done');
