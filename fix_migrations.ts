import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const toRemove = [
  "\"UPDATE deals SET stage='lead_opportunity' WHERE stage='lead';\",\n",
  "\"UPDATE deals SET hunterId = ownerId WHERE stage = 'lead_opportunity' AND ownerId IS NOT NULL;\",\n",
  "\"UPDATE deals SET closerId = ownerId WHERE (stage = 'discovery_proposal' OR stage = 'contracting' OR stage = 'onboarding') AND ownerId IS NOT NULL;\",\n",
  "\"UPDATE deals SET farmerId = ownerId WHERE stage = 'farming' AND ownerId IS NOT NULL;\",\n",
  "\"UPDATE deals SET stage='opportunity' WHERE stage='lead_opportunity';\",\n"
];

for (const line of toRemove) {
  content = content.replace(new RegExp("        " + line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), "");
}

fs.writeFileSync('server.ts', content);
console.log('done');
