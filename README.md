# FHB CRM

Kompletní interní CRM systém pro řízení akvizice, smlouvání, onboardingu a péče o fulfillment klienty.

## Rychlý přehled

- **1. fáze:** **Lead** (Zájemce, garant: Hunter)
- **2. fáze:** **Oportunita** (Kvalifikovaná příležitost / SQL, garant: Hunter)
- **3. fáze:** **Discovery & Ponuka** (Objevování & Nabídka, garant: Closer)
- **4. fáze:** **Contracting** (Zasmluvnění, garant: Closer)
- **5. fáze:** **Onboarding** (Integrace & Naskladňování, garant: Farmer)
- **6. fáze:** **Farming** (Živý provoz, garant: Farmer)
- **7. fáze:** **Lost / Postponed** (Ztraceno / Odloženo)

## Klíčové vlastnosti

- **Kanban & Seznam dealů:** Přehledná správa pipeline s obousměrným posunem a validací podmínek pro každou fázi.
- **Rychlý posun SQL [SQL →]:** Jakmile příležitost ve 2. fázi (Oportunita) splní všechny podmínky, na kartě se zobrazí tlačítko pro přímý posun do Discovery.
- **Striktní synchronizace e-mailů:** E-maily se k příležitosti párují výhradně podle e-mailových adres firmy a jejích kontaktů v kombinaci s e-mailem uživatele CRM. Nesouvisející e-maily jsou ze systému automaticky promazávány.
- **Hlídání neaktivity a připomínky:** 3 striktní podmínky pro barevné orámování (žlutá / oranžová / červená) a automatické ranní notifikační e-maily.
- **Integrace kalendářů:** Microsoft 365 a Google Workspace s generováním odkazů na MS Teams a Google Meet.
- **Statistiky & KPI:** Podrobný reporting pro příležitosti, obchodníky, stavy pipeline i důvody ztráty.

## Podrobná dokumentace

Kompletní a vyčerpávající dokumentaci naleznete v souboru [DOCUMENTATION.md](./DOCUMENTATION.md).

Uživatelský manuál lze také stáhnout v aplikaci v profilu uživatele nebo v souborech:
- `public/manual-cs.pdf` (Český manuál)
- `public/manual-en.pdf` (Anglický manuál)
- Endpoint `/api/manual?lang=cs` a `/api/manual?lang=en`
