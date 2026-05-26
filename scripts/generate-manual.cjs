const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const removeDiacritics = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const generatePDF = (lang, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    stream.on('finish', resolve);
    stream.on('error', reject);

    const isCS = lang === 'cs';
    
    // Titulek
    doc.fillColor('black');
    doc.font('Helvetica-Bold').fontSize(24).text(removeDiacritics(isCS ? 'Podrobný uživatelský manuál aplikace' : 'Detailed Application User Manual'), { align: 'center' });
    doc.moveDown();
    
    doc.font('Helvetica').fontSize(12)
      .text(removeDiacritics(isCS ? 'Tento dokument slouží jako detailní průvodce pro veškeré role systému CRM, specifikuje stavy, datové atributy a přechody.' : 'This document serves as a detailed guide for all CRM roles, specifying stages, data attributes, and transitions.'), { align: 'justify' })
      .moveDown(2);

    // 1. Zabezpeceni
    doc.font('Helvetica-Bold').fontSize(16).text(removeDiacritics(isCS ? '1. Úvod a přístup do systému' : '1. Introduction and System Access'), { underline: true });
    doc.font('Helvetica').fontSize(12)
      .text(removeDiacritics(isCS ? 'Přístup do systému je zajištěn výhradně na základě přidělených přístupových údajů (email a heslo). Prvotní heslo by mělo být co nejdříve změněno v sekci Profil. Během používání komunikuje systém bezpečně pomocí šifrovaného spojení. Data se organizují dle jednotlivých obchodních případů (Deals).' : 'System access is provided strictly through assigned credentials (email and password). The initial password should be changed as soon as possible in the Profile section. The system organizes data into commercial opportunities called Deals.'))
      .moveDown();

    // 2. Faze a prechody (Transitions)
    doc.font('Helvetica-Bold').fontSize(16).text(removeDiacritics(isCS ? '2. Přechody mezi stavy (Pipeline Transitions)' : '2. Pipeline Stages and Transitions'), { underline: true });
    doc.font('Helvetica').fontSize(11).text(removeDiacritics(isCS ? 'Životní cyklus obchodního případu (Deal) prochází pevně stanovenými fázemi. Pro přechod mezi nimi jsou vyžadována konkrétní data a práva.' : 'The lifecycle of a Deal progresses through fixed stages. Specific data and permissions are required to move between them.')).moveDown(0.5);
    
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
      doc.font('Helvetica-Bold').fontSize(11).text(removeDiacritics(s.name));
      doc.font('Helvetica').fontSize(11).text(removeDiacritics(s.requirements)).moveDown(0.5);
    });
    doc.moveDown();

    // 3. Role
    doc.font('Helvetica-Bold').fontSize(16).text(removeDiacritics(isCS ? '3. Seznam rolí a jejich operace' : '3. User Roles and Operations'), { underline: true });
    doc.moveDown(0.5);

    const rolesCS = [
      {
        name: 'Hunter',
        privileges: 'Operuje primarne v zacatcich (New -> Proposal).',
        actions: [
          'Vytvareni novych Dealu (Company Name, ICO, Zdroj).',
          'Vyplnovani zakladnich e-commerce platforem a Lead Sources.',
          'Zadavani a sprava kontaktnich osob dane firmy (titul, jmeno, email, telefon).',
          'Vytvareni meetingu a logovani historie (ikdyz pozdeji prebira nekdo jiny, Hunter ma read-only).'
        ]
      },
      {
        name: 'Closer',
        privileges: 'Prijima Deal po fazi Proposal, zameruje se na vykouzleni Contractu.',
        actions: [
          'Sprava atributu baliku (Vaha [Weight], Objem [Volume], Pocet).',
          'Urcovani dorucovacich zemi (Delivery countries - z multi-select vyberu).',
          'Muze provadet DNC (Do Not Contact) oznaceni klienta v pripade nespokojenosti.',
          'Kliknutim na "Add Offer" nahrava k dealu historicky neznicitelne cenove nabidky (v PDF).'
        ]
      },
      {
        name: 'Farmer (Account Manager)',
        privileges: 'Stara se o ziveho (Farming) a onboardujiciho klienta.',
        actions: [
          'Komunikuje s IT pro doplneni datumu "IT Integration Completed".',
          'Identifikuje realny start obchodu a prepisuje odhady.',
          'Prirazuje klientskym kontaktum tag "Inactive", pokud dana osoba opustila firmu.'
        ]
      },
      {
        name: 'Vedouci',
        privileges: 'Nadrizeny k rolim (Hunter/Closer/Farmer).',
        actions: [
          'Vidi Dealy vlastnene temi podrizenymi skrz cely system Kanbanu.',
          'Z pohledu uprav ziskava stejna prava (Muze editovat, psat poznamky).',
          'Monitoruje Email logy a kalendar.'
        ]
      },
      {
        name: 'CSO (Chief Sales Officer)',
        privileges: 'Absolutni pristup k Sales potrubi (Pipeline).',
        actions: [
          'U libovolneho Dealu muze v zalozce "Company Details" menit aktualni prirazeni v realnem case.',
          'Oznacenim zaznamu "Visible: false" je muze utajit pred nizsimi rolemi.'
        ]
      },
      {
        name: 'Admin',
        privileges: 'Zajistuje technicky chod aplikace.',
        actions: [
          'Sekce "Admin Panel": Zaklada ostatni uzivatele, resetuje hesla.',
          'Meni konstantni ciselniky: "Lead Sources", "Lost Reasons", atd.',
          'Spravuje tabulky s podrobnymi Login logy (historie prihlaseni).'
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
      doc.font('Helvetica-Bold').fontSize(14).text(`Role: ${r.name}`);
      doc.font('Helvetica-Bold').fontSize(11).text(removeDiacritics(r.privileges)).moveDown(0.5);
      
      doc.font('Helvetica');
      r.actions.forEach(a => {
        doc.text(`• ${removeDiacritics(a)}`, { indent: 20 });
      });
      doc.moveDown();
    });

    // 4. GUI & Ovladani
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(16).text(removeDiacritics(isCS ? '4. Grafické ukázky a interakce (Simulace)' : '4. UI Screenshots and Interfaces'), { underline: true });
    doc.moveDown();
    
    doc.font('Helvetica-Bold').fontSize(14).text(removeDiacritics(isCS ? 'D1: Horní panel (Header)' : 'D1: Header Panel'));
    doc.font('Helvetica').fontSize(11).text(removeDiacritics(isCS ? 'Na pravé straně vedle avatara uživatele naleznete přepínač jazyků, ikonu ozubeného kola (Nastavení integrace kalendáře - Google & Microsoft) a rozklinutím avatara se otevře tento profil.' : 'On the right side next to the user avatar, you can find language switchers, a gear icon (Calendar Integrations - Google & MS), and clicking your avatar opens this profile.'));
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(14).text(removeDiacritics(isCS ? 'D2: Detail firmy (Deal View)' : 'D2: Deal View'));
    doc.font('Helvetica').fontSize(11).text(removeDiacritics(isCS ? 'Rozdělené obrazovky:\n- LEVÝ PANEL: Údaje firmy, Tagy, Produktová část, Přenosy fází (Přesun fáze = Zelené tlačítko "Advance to..."). Pokud podtrhnuté pole svítí červeně, znamená to chybějící data pro přechod.\n- PRAVÝ PANEL: Log aktivit (hovory, zprávy), Dokumenty a historický vklad.' : 'Split view:\n- LEFT PANEL: Company details, Tags, Products, Stage transitions (Move stage = Green "Advance to..." button). If a field shines red, data is missing for the transition.\n- RIGHT PANEL: Activity Logs, Documents, and historical entries.'));
    
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
