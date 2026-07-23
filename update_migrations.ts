import fs from 'fs';

const serverCode = fs.readFileSync('server.ts', 'utf8');
const schemaCode = fs.readFileSync('schema.sql', 'utf8');

const updatedServerCode = serverCode.replace(
  /"UPDATE deals SET stage='opportunity' WHERE stage='lead_opportunity';"/,
  "\"UPDATE deals SET stage='opportunity' WHERE stage='lead_opportunity';\",\n        \"ALTER TABLE activities ADD COLUMN duration INT;\",\n        \"ALTER TABLE users ADD COLUMN isTestAccount BOOLEAN DEFAULT FALSE;\""
);
fs.writeFileSync('server.ts', updatedServerCode);

const updatedSchemaCode = schemaCode.replace(
  /meetingLink TEXT,/,
  "meetingLink TEXT,\n  duration INT,"
).replace(
  /resetTokenExpiry DATETIME,/,
  "resetTokenExpiry DATETIME,\n  isTestAccount BOOLEAN DEFAULT FALSE,"
);
fs.writeFileSync('schema.sql', updatedSchemaCode);
