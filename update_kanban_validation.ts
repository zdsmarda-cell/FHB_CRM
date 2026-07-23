import fs from 'fs';

let content = fs.readFileSync('src/components/views/KanbanBoard.tsx', 'utf8');

const opportunityValidation = `
        if (deal.stage === 'opportunity') {
          if (!deal.hunterId) {
            setAlertInfo({ isOpen: true, message: 'Nelze posunout: Chybí přiřazený Hunter.' });
            return;
          }
          const hasRelevantActivity = state.activities.some(
            (a: any) => a.dealId === deal.id && ['call', 'teams', 'meeting'].includes(a.type)
          );
          if (!hasRelevantActivity) {
            setAlertInfo({ isOpen: true, message: 'Nelze posunout: Pro posun z příležitosti musí být v historii alespoň jedna aktivita typu telefon, teams nebo osobní návštěva.' });
            return;
          }
        }
`;

content = content.replace(
  /if \(isForwardMove\) \{\n\s*if \(deal\.stage === 'lead'\) \{/,
  "if (isForwardMove) {\n" + opportunityValidation + "\n        if (deal.stage === 'lead') {"
);

fs.writeFileSync('src/components/views/KanbanBoard.tsx', content);
