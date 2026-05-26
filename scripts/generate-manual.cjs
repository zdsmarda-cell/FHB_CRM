const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const doc = new PDFDocument({ margin: 50 });
doc.registerFont('Roboto-Regular', path.join(__dirname, 'Roboto-Regular.ttf'));
doc.registerFont('Roboto-Bold', path.join(__dirname, 'Roboto-Bold.ttf'));

const outputPath = path.join(publicDir, 'manual-cs.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const pdfPromiseCS = new Promise((resolve, reject) => {
  stream.on('finish', resolve);
  stream.on('error', reject);
});

doc.font('Roboto-Bold').fontSize(24).text('Uživatelský manuál aplikace', { align: 'center' });
doc.moveDown();

doc.font('Roboto-Regular').fontSize(12)
  .text('Tento manuál slouží jako průvodce pro různé role v rámci aplikace.', { align: 'justify' })
  .moveDown();

doc.font('Roboto-Bold').fontSize(16).text('1. Instalace a přístup', { underline: true });
doc.font('Roboto-Regular').fontSize(12)
  .text('Aplikace je dostupná z webového prohlížeče. Není nutná žádná instalace, stačí přejít na URL adresu aplikace a přihlásit se pomocí Vašich přidělených údajů. Při prvním přihlášení doporučujeme změnit heslo v profilu uživatele.')
  .moveDown();

doc.font('Roboto-Bold').fontSize(16).text('2. Uživatelské role a funkce', { underline: true });
doc.moveDown();

const roles = [
  {
    name: 'Hunter',
    desc: 'Zodpovídá za vyhledávání a oslovování nových leadů, doplňování kontaktů, vedení schůzek (Discovery) a posun dealu do fáze návrhu (Proposal).',
    actions: [
      'Přidání nových příležitostí (Deals) přes tlačítko "Add Deal" na Kanban boardu.',
      'Přidávání kontaktů u detailu příležitosti.',
      'Plánování aktivit, logování proběhlých schůzek a emailů s klientem.',
      'Přiřazování (Tagging) aktivit, přesouvání dealu do fází "Discovery" a "Proposal".'
    ]
  },
  {
    name: 'Closer',
    desc: 'Úkolem Closera je finalizace podmínek, vytvoření nabídky na základě nasbíraných dat (váha, objem, atd.) a samotný podpis (Contracting).',
    actions: [
      'Vyplnění produktových atributů příležitosti (doručovací země, kusy, váha, objem).',
      'Připojování cenových nabídek k příležitosti.',
      'Vyjednávání a posun dealu do fází "Contracting" a případně "Onboarding" po úspěšném podpisu.',
      'Odmítnuté dealy označuje jako "Postponed" (s datem pro budoucí kontakt) nebo "Lost".'
    ]
  },
  {
    name: 'Farmer (Account Manager)',
    desc: 'Stará se o klienty od fáze integrace (Onboarding) až po dlouhodobou péči.',
    actions: [
      'Spravuje dealy od fáze "Onboarding" dále do "Farming".',
      'Zadává data jako datum podpisu smlouvy, nahrání ceníku do systému, začátek IT integrace.',
      'Eviduje první naskladnění (First Stocking) a předání do ostrého provozu (Farming).',
      'Plánuje pravidelné schůzky a spravuje historii aktivit s klientem.'
    ]
  },
  {
    name: 'Vedoucí',
    desc: 'Má přehled o aktivitách svých podřízených (Hunter, Closer, Farmer).',
    actions: [
      'Úprava a náhled příležitostí, které spravují jeho podřízení.',
      'Nahlížení do reportů a trackování prodeje skrz Dashboard widgety.',
      'Plánování cross-aktivit a vykrývání případných výpadků (zastupitelnost).'
    ]
  },
  {
    name: 'CSO (Chief Sales Officer)',
    desc: 'Řídí celkové prodeje a strategii a vidí všechny dealy bez ohledu na přiřazení.',
    actions: [
      'Přiřazení členů týmu (Hunter, Closer, Farmer) k jednotlivým příležitostem.',
      'Přístup do všech fází a ke všem záznamům firmy.',
      'Právo označovat aktivity jako viditelné či skryté (pro případnou interní komunikaci).'
    ]
  },
  {
    name: 'Admin',
    desc: 'Mimo všechny oprávnění prodeje řeší správu aplikace na pozadí.',
    actions: [
      'Správa uživatelů: Přidávání, úprava (včetně hesel a rolí) v Admin Panelu.',
      'Správa číselníku Lead Sources, E-commerce platforem, integrací, důvodů ztráty (Lost reasons).',
      'Přehled Email a Login logů aplikace.',
      'Exportování dat a hromadné operace.'
    ]
  }
];

roles.forEach(r => {
  doc.font('Roboto-Bold').fontSize(14).text(`Role: ${r.name}`);
  doc.font('Roboto-Regular').fontSize(12).text(r.desc).moveDown(0.5);
  r.actions.forEach(a => {
    doc.text(`• ${a}`, { indent: 20 });
  });
  doc.moveDown();
});

doc.font('Roboto-Bold').fontSize(16).text('3. Ukázky obrazovek a ovládání', { underline: true });
doc.moveDown();

doc.font('Roboto-Bold').fontSize(14).text('Kanban Board (Přehled prodejů)');
doc.font('Roboto-Regular').fontSize(12)
  .text('Zobrazuje příležitosti uspořádané podle fází (New, Discovery, Contracting... a další). Příležitosti lze přesouvat myší po jednotlivých sloupcích (Drag & Drop). Kliknutím na "Přidat Deal" / "Add Deal" založíte nové spojení.')
  .moveDown();

doc.font('Roboto-Bold').fontSize(14).text('Detail příležitosti');
doc.font('Roboto-Regular').fontSize(12)
  .text('Rozděleno na levý panel s detaily firmy, kontakty, produktovými údaji (pro Closera) a akcemi dealu. Vpravo se nachází Historie aktivit, sekce integrace e-mailů a schůzek a ukládání dokumentů.')
  .moveDown();

doc.font('Roboto-Bold').fontSize(14).text('Profil uživatele (Tato sekce)');
doc.font('Roboto-Regular').fontSize(12)
  .text('Profil umožňuje změnit uživatelské heslo a stáhnout tento návod. Dále se lze z hlavičky aplikace synchronizovat se svými Google / Microsoft kalendáři na záložce Kalendář (ikona ozubeného kolečka).')
  .moveDown();

doc.end();
console.log('Manual generated successfully');

// EN version
const docEn = new PDFDocument({ margin: 50 });
docEn.registerFont('Roboto-Regular', path.join(__dirname, 'Roboto-Regular.ttf'));
docEn.registerFont('Roboto-Bold', path.join(__dirname, 'Roboto-Bold.ttf'));
const outputPathEn = path.join(publicDir, 'manual-en.pdf');
const streamEn = fs.createWriteStream(outputPathEn);
docEn.pipe(streamEn);

const pdfPromiseEN = new Promise((resolve, reject) => {
  streamEn.on('finish', resolve);
  streamEn.on('error', reject);
});

docEn.font('Roboto-Bold').fontSize(24).text('Application User Manual', { align: 'center' });
docEn.moveDown();

docEn.font('Roboto-Regular').fontSize(12)
  .text('This manual serves as a guide for various roles within the application.', { align: 'justify' })
  .moveDown();

docEn.font('Roboto-Bold').fontSize(16).text('1. Installation and Access', { underline: true });
docEn.font('Roboto-Regular').fontSize(12)
  .text('The application is accessible from a web browser. No installation is necessary, just open the app URL and log in. We recommend changing your password in your user profile upon your first login.')
  .moveDown();

docEn.font('Roboto-Bold').fontSize(16).text('2. User Roles and Functions', { underline: true });
docEn.moveDown();

const rolesEn = [
  {
    name: 'Hunter',
    desc: 'Responsible for sourcing and reaching out to new leads, adding contacts, conducting Discovery meetings, and advancing deals to the Proposal stage.',
    actions: [
      'Adding new opportunities (Deals) via the "Add Deal" button on the Kanban board.',
      'Adding contacts to the opportunity details.',
      'Planning activities and logging past meetings and emails with the client.',
      'Tagging activities, maintaining notes, and advancing the deal to "Discovery" and "Proposal" stages.'
    ]
  },
  {
    name: 'Closer',
    desc: 'The Closer finalizes terms, creates price offers based on collected data (weight, volume, etc.), and drives the contract signature.',
    actions: [
      'Filling out product attributes for the opportunity (delivery countries, items, weight, volume).',
      'Attaching pricing offers to the opportunity.',
      'Negotiating and advancing the deal to the "Contracting" and "Onboarding" stages upon signature.',
      'Marking rejected deals as "Lost" or "Postponed" (with a date for future contact).'
    ]
  },
  {
    name: 'Farmer (Account Manager)',
    desc: 'Takes care of clients from the Onboarding phase to long-term management.',
    actions: [
      'Manages deals moving from the "Onboarding" stage into "Farming".',
      'Enters data such as contract signature dates, pricing uploads, and IT integration kickoff dates.',
      'Logs the First Stocking date and handover to Farming operations.',
      'Plans regular check-ins and manages activity history with the client.'
    ]
  },
  {
    name: 'Manager',
    desc: 'Oversees the activities of subordinates (Hunter, Closer, Farmer).',
    actions: [
      'Edits and reviews opportunities that subordinates are managing.',
      'Accesses reports and tracks sales metrics through Dashboard widgets.',
      'Plans cross-activities and ensures seamless coverage if someone is unavailable.'
    ]
  },
  {
    name: 'CSO (Chief Sales Officer)',
    desc: 'Directs overall sales strategy and can view/manage all deals regardless of assignment.',
    actions: [
      'Assigns team members (Hunter, Closer, Farmer) to individual opportunities.',
      'Full access to all stages and company records.',
      'Can toggle activity visibility (making activities visible or hidden for internal communication).'
    ]
  },
  {
    name: 'Admin',
    desc: 'In addition to all sales permissions, handles background application administration.',
    actions: [
      'User management: Adding, editing (including passwords and roles) from the Admin Panel.',
      'Managing enumerations (Lead Sources, E-commerce platforms, integrations, Lost reasons).',
      'Reviewing application Email and Login logs.',
      'Data exports and bulk operations.'
    ]
  }
];

rolesEn.forEach(r => {
  docEn.font('Roboto-Bold').fontSize(14).text(`Role: ${r.name}`);
  docEn.font('Roboto-Regular').fontSize(12).text(r.desc).moveDown(0.5);
  r.actions.forEach(a => {
    docEn.text(`• ${a}`, { indent: 20 });
  });
  docEn.moveDown();
});

docEn.font('Roboto-Bold').fontSize(16).text('3. UI Screenshots and Navigation', { underline: true });
docEn.moveDown();

docEn.font('Roboto-Bold').fontSize(14).text('Kanban Board (Sales Overview)');
docEn.font('Roboto-Regular').fontSize(12)
  .text('Displays opportunities organized by stages (New, Discovery, Contracting... etc). Opportunities can be moved across columns (Drag & Drop). Click "Add Deal" to create a new one.')
  .moveDown();

docEn.font('Roboto-Bold').fontSize(14).text('Deal Details');
docEn.font('Roboto-Regular').fontSize(12)
  .text('Divided into a left panel with company details, contacts, product data (for Closers), and deal actions. The right panel contains Activity History, Email/Meeting Integration, and Document Storage.')
  .moveDown();

docEn.font('Roboto-Bold').fontSize(14).text('User Profile');
docEn.font('Roboto-Regular').fontSize(12)
  .text('The profile allows you to change your password and download this manual. Additionally, you can connect your Google or Microsoft email and calendar accounts by clicking the settings gear in the application header.')
  .moveDown();

docEn.end();
console.log('EN Manual generated successfully');

Promise.all([pdfPromiseCS, pdfPromiseEN]).then(() => {
  console.log('Both PDFs generated and flushed successfully.');
}).catch((err) => {
  console.error('Error generating PDFs:', err);
});
