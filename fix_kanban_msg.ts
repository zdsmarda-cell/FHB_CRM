import fs from 'fs';

let kanbanCode = fs.readFileSync('src/components/views/KanbanBoard.tsx', 'utf8');
kanbanCode = kanbanCode.replace(
  /Nelze posunout: Pro posun z příležitosti musí být v historii alespoň jedna aktivita typu telefon, teams nebo osobní návštěva\./g,
  "Nelze posunout: Pro posun z příležitosti musí být v historii alespoň jedna proběhlá (v minulosti) aktivita typu telefon, teams nebo osobní návštěva."
);
fs.writeFileSync('src/components/views/KanbanBoard.tsx', kanbanCode);
