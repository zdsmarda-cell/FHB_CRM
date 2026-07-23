import fs from 'fs';

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  /AND a\.type IN \('call', 'teams', 'meeting'\)/g,
  "AND a.type IN ('call', 'teams', 'meeting')\n          AND a.date <= NOW()"
);
fs.writeFileSync('server.ts', serverCode);

let kanbanCode = fs.readFileSync('src/components/views/KanbanBoard.tsx', 'utf8');
kanbanCode = kanbanCode.replace(
  /\(a: any\) => a\.dealId === deal\.id && \['call', 'teams', 'meeting'\]\.includes\(a\.type\)/g,
  "(a: any) => a.dealId === deal.id && ['call', 'teams', 'meeting'].includes(a.type) && new Date(a.date) <= new Date()"
);
fs.writeFileSync('src/components/views/KanbanBoard.tsx', kanbanCode);
