import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const filterTarget = `      // Filter if relevantEmails provided
      if (relevantEmails && relevantEmails.length > 0) {
          const emailsLower = relevantEmails.map((e: string) => e.toLowerCase());
          events = events.filter(ev => {
             return ev.attendees.some((attObj: string) => emailsLower.includes((attObj || '').toLowerCase()));
          });
      }`;

const filterReplacement = `      // Filter if relevantEmails provided
      if (relevantEmails !== undefined) {
        if (relevantEmails.length === 0) {
          events = [];
        } else {
          const emailsLower = relevantEmails.map((e: string) => e.toLowerCase());
          events = events.filter(ev => {
             return ev.attendees.some((attObj: string) => emailsLower.includes((attObj || '').toLowerCase()));
          });
        }
      }`;

if (content.includes(filterTarget)) {
  content = content.replace(filterTarget, filterReplacement);
  fs.writeFileSync('server.ts', content);
  console.log('done server patch');
} else {
  console.log('could not find target in server.ts');
}
