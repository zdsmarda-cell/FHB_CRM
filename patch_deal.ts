import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

const target = `      // Sync Emails
      const resEmails = await apiFetch('/api/sync/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials, relevantEmails })
      });`;

const replacement = `      if (relevantEmails.length === 0) {
        useStore.getState().addNotification(t('deal.activities.noEmailsToSync', 'Nelze synchronizovat aktivity, není zadán e-mail (ani u příležitosti, ani u kontaktu).'), 'info');
        return;
      }
      
      // Sync Emails
      const resEmails = await apiFetch('/api/sync/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials, relevantEmails })
      });`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
  console.log('done deal patch');
} else {
  console.log('could not find target in deal view');
}
