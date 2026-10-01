# Podrobná dokumentace systému FHB CRM

Tento dokument představuje vyčerpávající technickou a uživatelskou dokumentaci aplikace **FHB CRM**. Dokumentace je udržována v aktuálním stavu a detailně reflektuje všechny součásti systému, datové toky, bezpečnostní pravidla a nedávné aktualizace (včetně přehození názvů 1. a 2. fáze pipeline a striktních pravidel synchronizace e-mailů).

---

## 1. Architektura a technologický zásobník

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite.
- **Backend:** Node.js, Express, TypeScript (`server.ts`), Background worker (`worker.ts`).
- **Databáze:** MySQL / MariaDB (databáze `fhb_crm`, podpora migrací a inicializačních skriptů v `server.ts`).
- **Autentizace:** JWT tokeny, bezpečné hashování hesel, role-based access control (RBAC).
- **Integrace:** Microsoft Graph API (Microsoft 365 Outlook & Teams), Google Workspace API (Gmail & Google Calendar).
- **Lokalizace:** `i18next` s plnou podporou češtiny (`cs`) i angličtiny (`en`).
- **Generování manuálů:** Vestavěný serverový endpoint `/api/manual` a PDFKit skript `scripts/generate-manual.cjs` exportující `public/manual-cs.pdf` a `public/manual-en.pdf`.

---

## 2. Fáze obchodního potrubí (Pipeline Stages & Transition Rules)

Obchodní proces je rozdělen do 7 fází. Pro posun dealu mezi fázemi musí být splněny striktní podmínky. Pokud libovolná podmínka není splněna, posun je zablokován a chybějící pole jsou v detailu karty vizuálně zvýrazněna.

### Přehled fází:

| Pořadí | Interní klíč | Název v CZ | Název v EN | Odpovědná role (Garant) |
|---|---|---|---|---|
| **1.** | `opportunity` | **Lead** (Zájemce) | **Lead** | Hunter |
| **2.** | `lead` | **Oportunita** (Kvalifikovaná příležitost / SQL) | **Opportunity** | Hunter |
| **3.** | `discovery_proposal` | **Discovery & Ponuka** | **Discovery & Proposal** | Closer |
| **4.** | `contracting` | **Contracting** (Zasmluvnění) | **Contracting** | Closer |
| **5.** | `onboarding` | **Onboarding** (Integrace & Naskladnění) | **Onboarding** | Farmer |
| **6.** | `farming` | **Farming** (Živý provoz) | **Farming (Won)** | Farmer |
| **7.** | `lost` | **Lost** (Ztraceno / Odloženo) | **Lost / Postponed** | Všechny role |

---

### Detailní validační podmínky jednotlivých fází:

#### 1. Fáze: Lead (klíč: `opportunity`)
- **Účel:** Prvotní zachycení a zaevidování kontaktu či potenciálního zájemce do obchodního potrubí.
- **Garant:** Hunter (`hunterId`).
- **Podmínky pro posun do 2. fáze (Oportunita):**
  1. Přiřazený odpovědný garant z rolí Hunter (`hunterId`).
  2. Vyplněné platné IČO v profilu společnosti (`companyId`).
  3. Minimálně 1 realizovaná aktivita (Telefonní hovor, MS Teams, nebo Schůzka) s datem konání v přítomnosti nebo minulosti.

#### 2. Fáze: Oportunita (klíč: `lead`)
- **Účel:** Prověřená a kvalifikovaná obchodní příležitost (Sales Qualified Lead - SQL) s ověřeným komerčním potenciálem.
- **Garant:** Hunter (`hunterId`).
- **Podmínky pro kvalifikaci (SQL):**
  1. Přiřazený odpovědný garant z rolí Hunter (`hunterId`).
  2. Vybraný **Zdroj leadu** ze systémového číselníku (`leadSourceId`).
  3. Vybraná **E-commerce platforma** (např. Shoptet, WooCommerce, Shopify, Custom API apod. – `ecommercePlatformId`).
  4. Kladný odhadovaný měsíční objem zásilek (`estimatedMonthlyParcels > 0`).
- **Rychlý posun tlačítkem [SQL →]:**
  - Jakmile jsou výše uvedené 4 podmínky splněny, přímo na kartě v Kanban desce se nad ikonou garanta (vpravo uprostřed) zobrazí zelené tlačítko **`[SQL →]`**.
  - Kliknutím na toto tlačítko může kdokoliv (včetně huntera) okamžitě odeslat příležitost do následující fáze *Discovery & Ponuka*, přičemž systém zobrazí potvrzující dialog s názvem přesunuté firmy.

#### 3. Fáze: Discovery & Ponuka (klíč: `discovery_proposal`)
- **Účel:** Sběr logistických specifikací, kalkulace nákladů a vystavení cenové nabídky klientovi.
- **Garant:** Closer (`closerId`).
- **Podmínky pro posun do Contracting:**
  1. Přiřazený odpovědný garant z rolí Closer (`closerId`).
  2. Výběr doručovacích zemí (`deliveryCountries` – minimálně 1 země v multi-select poli).
  3. Průměrný počet kusů na objednávku (`averageItemsPerOrder > 0`).
  4. Průměrná váha balíku (`averageParcelWeight > 0 kg`).
  5. Průměrný objem balíku (`averageParcelVolume > 0 m³`).
  6. Nahrán alespoň 1 PDF dokument cenové nabídky v sekci *Cenové nabídky* (`pricingOffers`).

#### 4. Fáze: Contracting (klíč: `contracting`)
- **Účel:** Příprava a podpis smluvní dokumentace, stanovení parametrů IT integrace a termínu závozu.
- **Garant:** Closer (`closerId`).
- **Podmínky pro posun do Onboardingu:**
  1. Přiřazený odpovědný garant z rolí Closer (`closerId`).
  2. Vyplněné datum podpisu smlouvy (`contractSignedDate`).
  3. Vyplněné datum nahrání schváleného ceníku (`pricingUploadedDate`).
  4. Vybraný typ IT integrace ze systémového číselníku (`itIntegrationId`).
  5. Vyplněné očekávané datum 1. naskladnění (`expectedFirstStockingDate`).

#### 5. Fáze: Onboarding (klíč: `onboarding`)
- **Účel:** Technická integrace systémů (API / konektor), naskladnění zboží na sklad a testovací provoz (UAT).
- **Garant:** Farmer (`farmerId`).
- **Podmínky pro posun do Farming:**
  1. Skutečné datum dokončení IT integrace (`itIntegrationCompletedDate`).
  2. Skutečné datum prvního naskladnění zboží (`firstStockingDateActual`).
  3. Skutečné datum dokončení testování zakázek UAT (`integrationTestingCompletedDate`).

#### 6. Fáze: Farming (klíč: `farming`)
- **Účel:** Ostrý fulfillment provoz klienta, dlouhodobá správa vztahu, upsell a expanze.
- **Garant:** Farmer (`farmerId`).
- **Pravidla:** Konečná produkční fáze pipeline (vyhraný obchod).

#### 7. Fáze: Lost (Ztraceno) & Postponed (Odloženo) (klíč: `lost`)
- **Účel:** Evidence neúspěšných nebo odložených obchodních jednání.
- **Pravidla:**
  - **Ztraceno (Lost):** Vyžaduje výběr důvodu ztráty ze systémového číselníku (`lostReasonId`) a volitelný komentář. Systém automaticky ukládá původní stav (`lostFromStage`), ze kterého byl deal ztracen, což umožňuje jeho pozdější obnovení zpět do původní fáze.
  - **Odloženo (Postponed):** Vyžaduje datum obnovení jednání (`postponedUntil`) a specifikaci důvodu odložení.

---

## 3. Role uživatelů a model oprávnění (RBAC)

Systém definuje 5 základních rolí a stromovou hierarchii manažerů:

1. **Hunter (Akvizitér):**
   - Zaměřuje se na 1. a 2. fázi pipeline (**Lead** a **Oportunita**).
   - Zakládá nové dealy, dohledává kontaktní osoby, zjišťuje e-commerce platformy a zdroje leadů.
   - Realizuje úvodní kvalifikační aktivity (hovory, schůzky, Teams).
   - Pomocí tlačítka `[SQL →]` předává kvalifikované příležitosti closerům.

2. **Closer (Obchodník):**
   - Přebírá příležitosti ve fázích **Discovery & Ponuka** a **Contracting**.
   - Definuje logistické parametry balíků, nahrává PDF nabídky, dojednává a uzavírá smlouvy.
   - Může označit kontakty příznakem DNC (*Do Not Contact*).

3. **Farmer (Key Account Manager):**
   - Odpovídá za fáze **Onboarding** a **Farming**.
   - Koordinuje IT integraci a fyzický návoz zboží, eviduje datum dokončení integrace a UAT testů.
   - Zajišťuje stálý klientský servis a značí neaktivní kontakty.

4. **Vedoucí / Manažer (Manager):**
   - Každý uživatel může mít v profilu přiřazeného nadřízeného (`managerId`).
   - Manažer automaticky vidí všechny příležitosti a záznamy všech svých přímých i nepřímých podřízených napříč celou pipeline a má nad nimi plná práva úprav.

5. **CSO (Chief Sales Officer):**
   - Globální přístup ke všem dealům, společnostem a fázím bez omezení.
   - Právo kdykoliv měnit garanty (Hunter, Closer, Farmer) u kteréhokoliv dealu v reálném čase.
   - Možnost přepínat viditelnost aktivit (`isVisible`).

6. **Administrátor (Admin):**
   - Kompletní správa uživatelských účtů (zakládání, úprava, deaktivace, reset hesel).
   - Plná správa systémových číselníků (Důvody ztráty, Zdroje leadů, IT Integrace, Segmenty, Způsoby skladování).
   - Přístup k bezpečnostním přihlašovacím logům (Login Logs) a auditní stopě změn (Audit Trail).

---

## 4. Striktní synchronizace a párování e-mailů (Microsoft 365 & Google Workspace)

Synchronizace e-mailů propojuje poštovní schránky uživatelů CRM s historií komunikace u jednotlivých obchodních případů.

### Zásadní pravidla synchronizace a integrity:

1. **Striktní párovací filtr (Relevance Matching):**
   - E-mail je k dané příležitosti přiřazen **VÝHRADNĚ tehdy**, pokud:
     - **a)** Seznam odesílatelů nebo příjemců (včetně CC/BCC) obsahuje alespoň jednu e-mailovou adresu navázanou na profil dané firmy (`company.email`) nebo na některou z jejích evidovaných kontaktních osob (`contact.email`), **A SOUČASNĚ**
     - **b)** Seznam odesílatelů nebo příjemců obsahuje e-mailovou adresu alespoň jednoho z uživatelů CRM (přihlášeného či integrovaného uživatele).
   - Jakékoliv cizí, soukromé, interní či nesouvisející zprávy jsou ze synchronizace striktně vyloučeny.

2. **Serverový čisticí mechanismus (Cleanup Routine):**
   - Při synchronizaci dealu i periodicky na pozadí probíhá kontrola existujících aktivit typu `email`.
   - Pokud se v databázi nachází e-mailová aktivita, která neodpovídá striktním párovacím adresám pro danou firmu, server ji **automaticky a bezpečně odstraní**. Tím je zaručeno, že se u dealů nikdy nezobrazují cizí e-maily.

3. **Multi-user synchronizace:**
   - Synchronizace načítá e-maily ze všech aktivních účtů v CRM, které mají autorizovanou integraci (Microsoft 365 Graph API nebo Google Workspace Gmail API). Tím je zaručeno, že komunikace různých kolegů (např. Hunter + Closer) s týmž klientem se korektně sloučí pod jedním dealem.

4. **Trvalost historie v CRM:**
   - E-maily jednou stažené a zařazené k dealu zůstávají v databázi CRM trvale uloženy jako auditované aktivity.
   - Pokud uživatel následně daný e-mail smaže ze své osobní schránky v Outlooku či Gmailu, **v CRM záznam zůstává zachován** pro zachování kontinuity obchodního vztahu.

---

## 5. Pravidla hlídání neaktivity a barevné stavové připomínky

Pro zamezení stagnace obchodních případů aplikace implementuje systém dynamických připomínek. V administraci lze pro každou fázi nastavit limitní dny neaktivity a barvu orámování (žlutá, oranžová, červená), případně akci automatického odeslání e-mailu.

### Tři striktní podmínky pro aktivaci výstrahy:
Vizuální orámování karty v Kanbanu/Seznamu i odeslání notifikačního e-mailu nastává **POUZE při současném splnění všech 3 podmínek**:

1. **Doba v daném stavu:**
   - Uplynulo alespoň **X** kalendářních dnů od okamžiku posledního přesunu dealu do aktuální fáze (podle časového razítka v auditním logu).
2. **Doba od poslední aktivity / úpravy:**
   - Uplynulo alespoň **X** kalendářních dnů od jakékoliv úpravy firmy/dealu, vytvoření nové aktivity (hovor, e-mail, schůzka, nabídka) či **smazání aktivity**.
   - *Poznámka:* Smazání jakékoliv aktivity je systémem zaznamenáno do auditní stopy a aktualizuje časové razítko `updatedAt`, čímž se odpočet neaktivity okamžitě restartuje.
3. **Doba od data konání aktivity:**
   - Pokud je u dealu naplánována aktivita s datem v budoucnosti (např. schůzka za 7 dní), lhůta neaktivity se počítá **až od data uskutečnění této budoucí aktivity**. Dokud je aktivita v budoucnu plánována, deal se považuje za aktivní a upozornění se neaktivuje.

### Ranní notifikační cron (8:00):
- Serverový worker každý pracovní den v 8:00 vyhodnotí pravidla s akcí „Odeslat e-mail“.
- Pokud deal splňuje všechny 3 podmínky, odešle souhrnný e-mail garantovi i jeho nadřízenému manažerovi.
- Každé odeslání je zaevidováno v *E-mailovém logu* v Administraci.

---

## 6. Kalendář a správa schůzek

- Uživatelé si v nastavení profilu mohou propojit své účty Microsoft 365 nebo Google Workspace.
- Schůzky naplánované v CRM se automaticky promítají do externího kalendáře uživatele.
- Vytvořená schůzka automaticky generuje videokonferenční odkaz (Google Meet nebo Microsoft Teams).

---

## 7. Statistiky a KPI reporting

Modul *Statistiky* poskytuje analytický přehled v následujících záložkách:

1. **Příležitosti (Opportunities KPI):**
   - Celkový počet vložených příležitostí.
   - Průměrná doba mezi vloženími nových obchodů.
   - **Průměrný čas přechodu z 1. stavu (Lead) do 2. stavu (Oportunita)** – analýza rychlosti prvotního kontaktu a kvalifikace.
2. **Uživatelé (Users KPI):**
   - Počet vytvořených dealů dle obchodníků, aktivita, konverzní poměry.
3. **Stavy (Stages KPI):**
   - Počty aktivních dealů v jednotlivých fázích (1. Lead až 6. Farming).
   - Odhadovaný roční objem balíků v potrubí.
   - Historický trychtýř konverzí mezi jednotlivými fázemi (Lead → Oportunita → Discovery → Contracting → Onboarding → Farming).
   - Ztrátovost a průměrná doba setrvání v jednotlivých stavech.
4. **Ztraceno (Lost KPI):**
   - Analýza důvodů odpadu, z jaké fáze nejčastěji dealy odpadávají a celkový ztracený objem balíků.

---

## 8. Generování a export uživatelské dokumentace

Aplikace poskytuje několik kanálů pro přístup k aktuální dokumentaci:

1. **Webový manuál přes API (`/api/manual`):**
   - Dostupný z profilu uživatele kliknutím na odkaz „Manuál“.
   - Plně lokalizovaný do češtiny (`?lang=cs`) i angličtiny (`?lang=en`).
   - Připraven pro tisk i export do PDF přímo v prohlížeči (pomocí CSS `@media print`).
2. **Předgenerované PDF manuály:**
   - `public/manual-cs.pdf` – kompletní uživatelský manuál v češtině.
   - `public/manual-en.pdf` – kompletní uživatelský manuál v angličtině.
   - Generovány skriptem `node scripts/generate-manual.cjs`.
3. **Projektová dokumentace:**
   - Soubor `DOCUMENTATION.md` v kořenu projektu jako centrální technický referenční zdroj.

---

## 9. Datový model, DB deskripce a API specifikace pro výměnu dat

V administraci systému (záložka **Datový model & API**) je k dispozici interaktivní nástroj pro kompletní technickou inspekci databázové struktury. Slouží jako závazný podklad pro vývojáře, systémové integrátory a pro výměnu dat mezi FHB CRM a jinými externími systémy (ERP, jiné CRM, logistické platformy):

### Klíčové vlastnosti modulu Datový model:
1. **Podrobná tabulka atributů každé entity:**
   - Název atributu (včetně označení primárních `[PK]` a cizích klíčů `[FK]`).
   - Přesný SQL datový typ (`VARCHAR`, `INT`, `DATETIME`, `DECIMAL(10,2)`, `JSON`, `BOOLEAN`).
   - Odpovídající formát v JSON API (`string (UUID)`, `string (ISO 8601 UTC)`, `number`, `boolean`, `array`).
   - Příznak povinnosti (`Povinné` / `Volitelné`).
   - Podrobný popis, formátovací pravidla, výčet povolených enum hodnot a vazby na mateřské tabulky.
   - Vzorová reálná hodnota pro testování.
2. **Vzorový JSON payload pro každou entitu:**
   - Kompletní validní ukázkový JSON objekt připravený pro REST API request / response.
   - Tlačítko pro okamžité zkopírování do schránky jedním kliknutím.
3. **SQL DDL schéma (CREATE TABLE):**
   - Přesný DDL kód tabulky pro MySQL / MariaDB včetně indexů a integritních omezení.
4. **Export kompletní interaktivní HTML dokumentace (fhbcrm_doc.zip):**
   - Tlačítko „Stáhnout dokumentaci (HTML ZIP - fhbcrm_doc.zip)“ vygeneruje a stáhne ZIP balíček obsahující plnohodnotnou klikací HTML dokumentaci systému.
   - Soubor `index.html` slouží jako hlavní rozcestník a vstupní bod.
   - Archiv obsahuje samostatné HTML stránky pro každou entitu (`entities/*.html`), API integrační příručku (`api_guide.html`), zobrazení SQL schématu (`database_schema.html`), strojově čitelnou specifikaci (`fhb-crm-spec.json`) a čistý SQL inicializační skript (`schema.sql`).
   - Celý webový balíček funguje offline bez nutnosti připojení k internetu či spuštěného serveru.
5. **Export kompletní API specifikace do souboru JSON:**
   - Tlačítko „Stáhnout API specifikaci (JSON)“ vygeneruje ucelený JSON soubor obsahující všechny entity, atributy, typy i ukázkové payloady.
6. **Programatický REST endpoint:**
   - `GET /api/database-schema?lang=cs` (nebo `?lang=en`) pro strojové čtení struktury externími integračními službami.
   - `GET /api/doc/fhbcrm_doc.zip` pro přímé stažení archivu dokumentace přes HTTP.

### Přísné oddělení administrátorských záložek:
- **Záložka Nastavení (Číselníky):** Slouží výhradně pro živou správu, editaci, aktivaci a mazání položek 7 systémových číselníků (Zdroje leadů, Segmenty, E-commerce platformy, Typy skladování, IT integrace, Důvody ztráty, Pozice kontaktů).
- **Záložka Datový model & API:** Zobrazuje čistě technický datový model, schémata entit, formáty sloupců, vztahy, integrační doporučení a exportní nástroje (`fhbcrm_doc.zip`, JSON specifikace). Číselníky se zde zobrazují pouze jako referenční datová specifikace pro API integraci.

### Přehled evidovaných entit a tabulek:
- **`companies`** (Firma / Společnost): IČO, název, adresa, region, segment, kontakty, e-maily, URL.
- **`deals`** (Obchodní případ): Fáze pipeline (1. Lead až 6. Farming), garanti (Hunter, Closer, Farmer), logistické parametry, smluvní a onboarding data.
- **`contacts`** (Kontaktní osoba): Jméno, pozice, e-mail, telefon, DNC status.
- **`activities`** (Aktivita): Hovory, schůzky, MS Teams, synchronizované e-maily, doba trvání, zápisy.
- **`users`** (Uživatel): Účty, role, hierarchie manažerů, integrace.
- **`stage_reminders`** (Stavové připomínky): Pravidla neaktivity a orámování.
- **`audit_logs`** (Auditní stopa): Historie změn jednotlivých polí.
- **`login_logs`** (Přihlášení): Bezpečnostní záznamy přístupů.
- **Systémové číselníky:** `lead_sources`, `lost_reasons`, `segments`, `ecommerce_platforms`, `it_integrations`, `storage_types`, `contact_positions`.

