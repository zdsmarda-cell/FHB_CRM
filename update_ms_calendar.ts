import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(
  /const startDateTime = new Date\(activityDetails\.date\);\n\s*const endDateTime = new Date\(startDateTime\.getTime\(\) \+ 60 \* 60 \* 1000\);/g,
  "const startDateTime = new Date(activityDetails.date);\n            const durationMinutes = activityDetails.duration || 60;\n            const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);"
);

fs.writeFileSync('server.ts', serverCode);
