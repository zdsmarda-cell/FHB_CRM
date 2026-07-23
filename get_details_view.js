const fs = require('fs');

const content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

const m = content.match(/const \{.*?\} = state;/g);
console.log(m);

