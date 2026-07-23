import fs from 'fs';

const typesCode = fs.readFileSync('src/types.ts', 'utf8');
const updatedTypesCode = typesCode.replace(
  /meetingLink\?: string;/,
  "meetingLink?: string;\n  duration?: number;"
).replace(
  /resetTokenExpiry\?: string;/,
  "resetTokenExpiry?: string;\n  isTestAccount?: boolean;"
);
fs.writeFileSync('src/types.ts', updatedTypesCode);
