const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const generatePDF = (lang, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('Roboto-Regular', path.join(__dirname, 'Roboto-Regular.ttf'));
    doc.registerFont('Roboto-Bold', path.join(__dirname, 'Roboto-Bold.ttf'));
    
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    stream.on('finish', resolve);
    stream.on('error', reject);

    const isCS = lang === 'cs';
    
    // Titulek
    doc.font('Roboto-Bold').fontSize(24).text(isCS ? 'Podrobný uživatelský manuál aplikace' : 'Detailed Application User Manual', { align: 'center' });
    doc.moveDown();
    
    doc.font('Roboto-Regular').fontSize(12)
      .text(isCS ? 'Tento dokument slouží jako detailní průvodce pro veškeré role systému CRM, specifikuje stavy, datové atributy a přechody.' : 'This document serves as a detailed guide for all CRM roles, specifying stages, data attributes, and transitions.', { align: 'justify' })
      .moveDown(2);

    // 1. Zabezpeceni
    doc.font('Roboto-Bold').fontSize(16).text(isCS ? '1. Úvod a přístup do systému' : '1. Introduction and System Access', { underline: true });
    doc.font('Roboto-Regular').fontSize(12)
      .text(isCS ? 'Přístup do systému je zajištěn výhradně na základě přidělených přístupových údajů (email a heslo). Prvotní heslo by mělo být co nejdříve změněno v sekci Profil. Během používání komunikuje systém bezpečně pomocí šifrovaného spojení. Data se organizují dle jednotlivých obchodních případů (Deals).' : 'System access is provided strictly through assigned credentials (email and password). The initial password should be changed as soon as possible in the Profile section. The system organizes data into commercial opportunities called Deals.')
      .moveDown();

    // 2. Faze a prechody (Transitions)
    doc.font('Roboto-Bold').fontSize(16).text(isCS ? '2. Přechody mezi stavy (Pipeline Transitions)' : '2. Pipeline Stages and Transitions', { underline: true });
    doc.font('Roboto-Regular').fontSize(11).text(isCS ? 'Životní cyklus obchodního případu (Deal) prochází pevně stanovenými fázemi. Pro přechod mezi nimi jsou vyžadována konkrétní data a práva.' : 'The lifecycle of a Deal progresses through fixed stages. Specific data and permissions are required to move between them.').moveDown(0.5);
    
    const stages = isCS ? [
      { name: 'New (Otevřený lead)', requirements: 'Vyžaduje pouhé založení přes Kanban desku. Tuto fází běžně operuje Hunter.' },
      { name: 'Discovery & Proposal', requirements: 'Pro přechod do této fáze musí Hunter provézt úvodní schůzku. Zde probíhá komunikace, odesílají se nabídky.' },
      { name: 'Contracting (Smlouvání)', requirements: 'Klíčový přechod. Nutno vyplnit: Doručovací země (Delivery countries), Průměrný počet kusů v objednávce (Items), Váha (Weight), Objem (Volume). Nutno nahrát cenovou nabídku.' },
      { name: 'Onboarding', requirements: 'Smlouva je podepsána. Vyžadovaná pole pro přechod: Datum podpisu smlouvy (Contract Signed Date), Datum nahrání ceníku, Preferovaný začátek IT integrace a Očekávané první naskladnění.' },
      { name: 'Farming (Živý provoz)', requirements: 'Konečná fáze. Vyžaduje: Potvrzení o dokončení IT integrace, Ostré datum prvního naskladnění (Actual First Stocking) a dokončené UAT testování.' },
      { name: 'Lost & Postponed', requirements: 'Z jakékoliv fáze lze přejít do rozeznání ztráty (Lost - vyžaduje vybrání důvodu úbytku ze sdíleného číselníku) nebo Odložení (Postponed - vyžaduje zadání data připomenutí a důvodu odložení).' }
    ] : [
      { name: 'New (Open lead)', requirements: 'Only requires creation via Kanban board. Fully operated by Hunter.' },
      { name: 'Discovery & Proposal', requirements: 'Transitioned by Hunter after initial meeting. Used for communication and proposals.' },
      { name: 'Contracting', requirements: 'Critical transition. Mandatory attributes: Delivery countries, Average Items, Weight, Volume. Must upload a pricing offer.' },
      { name: 'Onboarding', requirements: 'Contract signed. Required fields: Contract Signed Date, Pricing Upload Date, IT Integration ID/Start, and Expected First Stocking Date.' },
      { name: 'Farming (Live operations)', requirements: 'Final stage. Requires: IT Integration Completed Date, Actual First Stocking Date, and Testing Completed Date.' },
      { name: 'Lost & Postponed', requirements: 'Can be transitioned to from any stage. Lost requires a reason from enumerations. Postponed requires resume date and reason.' }
    ];

    stages.forEach(s => {
      doc.font('Roboto-Bold').fontSize(11).text(s.name);
      doc.font('Roboto-Regular').fontSize(11).text(s.requirements).moveDown(0.5);
    });
    doc.moveDown();

    // 3. Role
    doc.font('Roboto-Bold').fontSize(16).text(isCS ? '3. Seznam rolí a jejich operace' : '3. User Roles and Operations', { underline: true });
    doc.moveDown(0.5);

    const rolesCS = [
      {
        name: 'Hunter',
        privileges: 'Operuje primárně v začátcích (New -> Proposal).',
        actions: [
          'Vytváření nových Dealů (Company Name, IČO, Zdroj).',
          'Vyplňování základních e-commerce platforem a Lead Sources.',
          'Zadávání a správa kontaktních osob dané firmy (titul, jméno, email, telefon).',
          'Vytváření meetingů a logování historie (ikdyž později přebírá někdo jiný, Hunter má read-only).'
        ]
      },
      {
        name: 'Closer',
        privileges: 'Přijímá Deal po fázi Proposal, zaměřuje se na vykouzlení Contractu.',
        actions: [
          'Správa atributů balíků (Váha [Weight], Objem [Volume], Počet).',
          'Určování doručovacích zemí (Delivery countries - z multi-select výběru).',
          'Může provádět DNC (Do Not Contact) označení klienta v případě nespokojenosti.',
          'Kliknutím na "Add Offer" nahrává k dealu historicky nezničitelné cenové nabídky (v PDF).'
        ]
      },
      {
        name: 'Farmer (Account Manager)',
        privileges: 'Stará se o živého (Farming) a onboardujícího klienta.',
        actions: [
          'Komunikuje s IT pro doplnění datumů "IT Integration Completed".',
          'Identifikuje reálný start obchodu a přepisuje odhady.',
          'Přiřazuje klientským kontaktům tag "Inactive", pokud daná osoba opustila firmu.'
        ]
      },
      {
        name: 'Vedoucí',
        privileges: 'Nadřízený k rolím (Hunter/Closer/Farmer).',
        actions: [
          'Vidí Dealy vlastněné těmito podřízenými skrz celý systém Kanbanu.',
          'Z pohledu úprav získává stejná práva (Může editovat, psát poznámky).',
          'Monitoruje Email logy a kalendář (pokud je synchronizován přes ikonu ozubeného kolečka v horním panelu).'
        ]
      },
      {
        name: 'CSO (Chief Sales Officer)',
        privileges: 'Absolutní přístup k Sales potrubí (Pipeline).',
        actions: [
          'U libovolného Dealu může v záložce "Company Details" měnit aktuální přiřazení (Hunter, Closer, Farmer) v reálném čase formou Dropdownu.',
          'Označením záznamů (Aktivity) "Visible: false" je může utajit před nižšími rolemi.'
        ]
      },
      {
        name: 'Admin',
        privileges: 'Zajišťuje technický chod aplikace.',
        actions: [
          'Sekce "Admin Panel": Zakládá ostatní uživatele, resetuje hesla.',
          'Mění konstantní číselníky: "Lead Sources", "Lost Reasons", atd.',
          'Spravuje tabulky s podrobnými Login logy (historie přihlášení) a audit-trailem (kdo kdy jaké políčko změnil).'
        ]
      }
    ];

    const rolesEN = [
      {
        name: 'Hunter',
        privileges: 'Operates primarily in the early stages (New -> Proposal).',
        actions: [
          'Creates new Deals (Company Name, ID, Source).',
          'Fills basic e-commerce platforms and Lead Sources.',
          'Enters and manages contact persons for the company.',
          'Creates meetings and logs history (read-only for others later).'
        ]
      },
      {
        name: 'Closer',
        privileges: 'Receives the Deal after Proposal, focuses on Contracting.',
        actions: [
          'Manages parcel attributes (Weight, Volume, Items).',
          'Defines delivery countries (Delivery countries multi-select).',
          'Can mark client contacts as DNC (Do Not Contact).',
          'Uploads pricing offers (PDFs) clicking "Add Offer".'
        ]
      },
      {
        name: 'Farmer (Account Manager)',
        privileges: 'Handles live (Farming) and onboarding clients.',
        actions: [
          'Communicates with IT to log "IT Integration Completed" dates.',
          'Identifies actual launch metadata and overrides estimates.',
          'Can tag client contacts as "Inactive" if they leave their company.'
        ]
      },
      {
        name: 'Manager',
        privileges: 'Supervisor of Hunter/Closer/Farmer roles.',
        actions: [
          'Sees Deals owned by their subordinates across the Kanban board.',
          'Inherits edit permissions for subordinate deals.',
          'Monitors Email logs and synced calendars.'
        ]
      },
      {
        name: 'CSO (Chief Sales Officer)',
        privileges: 'Absolute access to the Sales Pipeline.',
        actions: [
          'Can change role assignments (Hunter, Closer, Farmer) in real-time via the "Company Details" tab.',
          'Can hide sensitive activities (Visible: false) from lower roles.'
        ]
      },
      {
        name: 'Admin',
        privileges: 'Ensures technical operation.',
        actions: [
          '"Admin Panel": Creates users, resets passwords.',
          'Manages enumerations: "Lead Sources", "Lost Reasons", etc.',
          'Manages Login logs and the full audit trail (tracking all field changes).'
        ]
      }
    ];

    const rolesList = isCS ? rolesCS : rolesEN;
    rolesList.forEach(r => {
      doc.addPage();
      doc.font('Roboto-Bold').fontSize(14).text(`Role: ${r.name}`);
      doc.font('Roboto-Bold').fontSize(11).text(r.privileges).moveDown(0.5);
      
      doc.font('Roboto-Regular');
      r.actions.forEach(a => {
        doc.text(`• ${a}`, { indent: 20 });
      });
      doc.moveDown();
    });

    // 4. GUI & Ovladani
    doc.addPage();
    doc.font('Roboto-Bold').fontSize(16).text(isCS ? '4. Grafické ukázky a interakce (Simulace)' : '4. UI Screenshots and Interfaces', { underline: true });
    doc.moveDown();
    
    doc.font('Roboto-Bold').fontSize(14).text(isCS ? 'D1: Horní panel (Header)' : 'D1: Header Panel');
    doc.font('Roboto-Regular').fontSize(11).text(isCS ? 'Na pravé straně vedle avatara uživatele naleznete přepínač jazyků, ikonu ozubeného kola (Nastavení integrace kalendáře - Google & Microsoft) a rozklinutím avatara se otevře tento profil.' : 'On the right side next to the user avatar, you can find language switchers, a gear icon (Calendar Integrations - Google & MS), and clicking your avatar opens this profile.');
    doc.moveDown();

    doc.font('Roboto-Bold').fontSize(14).text(isCS ? 'D2: Detail firmy (Deal View)' : 'D2: Deal View');
    doc.font('Roboto-Regular').fontSize(11).text(isCS ? 'Rozdělené obrazovky:\n- LEVÝ PANEL: Údaje firmy, Tagy, Produktová část, Přenosy fází (Přesun fáze = Zelené tlačítko "Advance to..."). Pokud podtrhnuté pole svítí červeně, znamená to chybějící data pro přechod.\n- PRAVÝ PANEL: Log aktivit (hovory, zprávy), Dokumenty a historický vklad.' : 'Split view:\n- LEFT PANEL: Company details, Tags, Products, Stage transitions (Move stage = Green "Advance to..." button). If a field shines red, data is missing for the transition.\n- RIGHT PANEL: Activity Logs, Documents, and historical entries.');
    
    doc.end();
  });
};

Promise.all([
  generatePDF('cs', path.join(publicDir, 'manual-cs.pdf')),
  generatePDF('en', path.join(publicDir, 'manual-en.pdf'))
]).then(() => {
  console.log('Both super-detailed PDFs generated successfully.');
}).catch((err) => {
  console.error('Error generating detailed PDFs:', err);
});
