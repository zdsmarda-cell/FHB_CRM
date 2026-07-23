import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

content = content.replace(
  /let generatedMeetingLink = activityType === 'teams' \? meetingLink : undefined;/,
  "const finalDuration = Math.max(1, Math.min(1440, duration || 60));\n    let generatedMeetingLink = activityType === 'teams' ? meetingLink : undefined;"
);

content = content.replace(
  /duration\n\s*\}\)/g,
  "duration: finalDuration\n      })"
);

content = content.replace(
  /duration\n\s*\}/g,
  "duration: finalDuration\n            }"
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
