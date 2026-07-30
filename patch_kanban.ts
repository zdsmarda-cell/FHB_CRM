import fs from 'fs';

let content = fs.readFileSync('src/components/views/KanbanBoard.tsx', 'utf8');

const target = `        if (deal.stage === 'opportunity') {
          if (!deal.hunterId) {
            setAlertInfo({ isOpen: true, message: 'Nelze posunout: Chybí přiřazený Hunter.' });
            return;
          }
          const hasRelevantActivity = state.activities.some(
            (a: any) => a.dealId === deal.id && ['call', 'teams', 'meeting'].includes(a.type) && new Date(a.date) <= new Date()
          );
          if (!hasRelevantActivity) {
            setAlertInfo({ isOpen: true, message: 'Nelze posunout: Pro posun z příležitosti musí být v historii alespoň jedna proběhlá (v minulosti) aktivita typu telefon, teams nebo osobní návštěva.' });
            return;
          }
        }`;

const replacement = `        if (deal.stage === 'opportunity') {
          if (!deal.hunterId) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingHunter') });
            return;
          }

          const company = state.companies.find(c => c.id === deal.companyId);
          if (!company?.companyId || company.companyId.trim() === '') {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingIco') });
            return;
          }

          const hasRelevantActivity = state.activities.some(
            (a: any) => a.dealId === deal.id && ['call', 'teams', 'meeting'].includes(a.type) && new Date(a.date) <= new Date()
          );
          if (!hasRelevantActivity) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingActivity') });
            return;
          }
        }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/views/KanbanBoard.tsx', content);
  console.log('done kanban');
} else {
  console.log('target not found in kanban');
}
