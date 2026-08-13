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
    doc.font('Helvetica-Bold').fontSize(16).text(removeDiacritics(isCS ? '2. Přechody mezi stavy (Pipeline Stages & Requirements)' : '2. Pipeline Stages & Transition Requirements'), { underline: true });
    doc.font('Helvetica').fontSize(11).text(removeDiacritics(isCS ? 'Pro přesun obchodního případu (Deal) do další fáze je nutné splnit striktní podmínky validace dat. Pokud chybí povinný údaj, přesun je zablokován.' : 'To move a deal to the next stage, strict data validation rules must be met. Missing required fields will block the transition.')).moveDown(0.5);
    
    const stagesDetailed = isCS ? [
      {
        name: '1. Opportunity (Oportunita / Zájemce) [Garant: Hunter]',
        reqs: [
          'Prirazeni garanta z roli Hunter (Hunter ID).',
          'Vyplnene ICO v profilu spolecnosti.',
          'Alespon 1 realizovana aktivita (Hovor, Teams, Schuzka) s datem v minulosti nebo pritomnosti.'
        ]
      },
      {
        name: '2. Lead (Kvalifikovany lead) [Garant: Hunter]',
        reqs: [
          'Prirazeni garanta z roli Hunter (Hunter ID).',
          'Vyplneny Zdroj leadu (Lead Source z ciselniku).',
          'Vyplnena E-commerce platforma (Shoptet, WooCommerce, Custom API apod.).',
          'Kladny odhadovany mesicni pocet zasilok (> 0).'
        ]
      },
      {
        name: '3. Discovery & Proposal (Objevovani & Nabidka) [Garant: Closer]',
        reqs: [
          'Prirazeni garanta z roli Closer (Closer ID).',
          'Vyber dorucovacich zemi (Delivery Countries - alespon 1 zeme).',
          'Prumerny pocet kusu na objednavku (> 0).',
          'Prumerna vaha baliku in kg (> 0 kg).',
          'Prumerny objem baliku in m3 (> 0 m3).',
          'Nahrana alespon 1 Cenova nabidka v PDF.'
        ]
      },
      {
        name: '4. Contracting (Smluvni jednani) [Garant: Closer]',
        reqs: [
          'Prirazeni garanta z roli Closer (Closer ID).',
          'Datum podpisu smlouvy (Contract Signed Date).',
          'Datum nahrani schvaleneho ceniku (Pricing Uploaded Date).',
          'Vybrany system IT integrace (IT Integration ID).',
          'Ocekavane datum 1. naskladneni (Expected First Stocking Date).'
        ]
      },
      {
        name: '5. Onboarding (Integrace & Naskladnovani) [Garant: Farmer]',
        reqs: [
          'Skutecne datum dokonceni IT integrace (IT Integration Completed Date).',
          'Skutecne datum prvniho naskladneni (Actual First Stocking Date).',
          'Skutecne datum dokonceni testovani UAT (Testing Completed Date).'
        ]
      },
      {
        name: '6. Farming (Zivy provoz) [Garant: Farmer]',
        reqs: [
          'Konecna produkcni faze. Klient generuje zive objednavky v systemu.'
        ]
      },
      {
        name: '7. Lost (Ztraceno) & Postponed (Odlozeno)',
        reqs: [
          'Lost: Vyzaduje vybrani Duvodu ztraty z ciselniku.',
          'Postponed: Vyzaduje datum obnoveni jednani a duvod odlozeni.'
        ]
      }
    ] : [
      {
        name: '1. Opportunity [Owner: Hunter]',
        reqs: [
          'Assigned Hunter (Hunter ID).',
          'Company ID / Registration Number.',
          'At least 1 completed activity (Call, Teams, Meeting) dated present or past.'
        ]
      },
      {
        name: '2. Qualified Lead [Owner: Hunter]',
        reqs: [
          'Assigned Hunter (Hunter ID).',
          'Selected Lead Source from enumeration.',
          'Selected E-commerce Platform.',
          'Positive Estimated Monthly Parcels (> 0).'
        ]
      },
      {
        name: '3. Discovery & Proposal [Owner: Closer]',
        reqs: [
          'Assigned Closer (Closer ID).',
          'Selected Delivery Countries (at least 1 country).',
          'Average Items Per Order (> 0).',
          'Average Parcel Weight (> 0 kg).',
          'Average Parcel Volume (> 0 m3).',
          'Uploaded at least 1 Pricing Offer PDF.'
        ]
      },
      {
        name: '4. Contracting [Owner: Closer]',
        reqs: [
          'Assigned Closer (Closer ID).',
          'Contract Signed Date.',
          'Pricing Uploaded Date.',
          'Selected IT Integration system.',
          'Expected First Stocking Date.'
        ]
      },
      {
        name: '5. Onboarding [Owner: Farmer]',
        reqs: [
          'IT Integration Completed Date.',
          'Actual First Stocking Date.',
          'UAT Testing Completed Date.'
        ]
      },
      {
        name: '6. Farming (Live operations) [Owner: Farmer]',
        reqs: [
          'Final production stage. Live order processing.'
        ]
      },
      {
        name: '7. Lost & Postponed',
        reqs: [
          'Lost: Requires selecting a Lost Reason from enumeration.',
          'Postponed: Requires Postponed Until date and reason.'
        ]
      }
    ];

    stagesDetailed.forEach(s => {
      doc.font('Helvetica-Bold').fontSize(11).text(removeDiacritics(s.name));
      doc.font('Helvetica').fontSize(10);
      s.reqs.forEach(r => {
        doc.text(`  • ${removeDiacritics(r)}`);
      });
      doc.moveDown(0.5);
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
