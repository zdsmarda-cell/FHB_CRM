export interface SchemaField {
  name: string;
  sqlType: string;
  apiType: string;
  required: boolean;
  isPrimaryKey?: boolean;
  foreignKey?: string;
  descriptionCs: string;
  descriptionEn: string;
  example: any;
  allowedValues?: string[];
}

export interface SchemaEntity {
  id: string;
  tableName: string;
  nameCs: string;
  nameEn: string;
  descriptionCs: string;
  descriptionEn: string;
  primaryKey: string;
  relationsCs: string;
  relationsEn: string;
  fields: SchemaField[];
  exampleJson: Record<string, any>;
  sqlDdl: string;
}

export const DATA_MODEL_ENTITIES: SchemaEntity[] = [
  {
    id: 'companies',
    tableName: 'companies',
    nameCs: 'Firma / Společnost (Lead / Účet)',
    nameEn: 'Company / Account',
    descriptionCs: 'Reprezentuje klientskou organizaci nebo potenciálního zákazníka. Slouží jako základní kotevní entita pro obchodní příležitosti, kontaktní osoby a auditované e-maily.',
    descriptionEn: 'Represents a client business organization or prospective customer. Serves as the primary parent entity for commercial deals, contact persons, and audited emails.',
    primaryKey: 'id',
    relationsCs: 'Vazba 1:N na Obchodní případy (deals.companyId), 1:N na Kontaktní osoby (embedded v contacts), 1:N na Auditní záznamy.',
    relationsEn: '1:N relation to Deals (deals.companyId), 1:N relation to Contacts (embedded in contacts), 1:N relation to Audit Logs.',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní systémový identifikátor firmy v CRM.',
        descriptionEn: 'Unique system identifier of the company in CRM.',
        example: 'comp-782a9f1b-4c22-48a0-9c12-ef5b77823e41'
      },
      {
        name: 'companyId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string',
        required: true,
        descriptionCs: 'Identifikační číslo osoby (IČO v CZ/SK). Povinné pro posun z 1. fáze (Lead) do 2. fáze (Oportunita).',
        descriptionEn: 'Company registration number (IČO in CZ/SK). Required to advance from 1. stage (Lead) to 2. stage (Opportunity).',
        example: '27182818'
      },
      {
        name: 'name',
        sqlType: 'VARCHAR(100)',
        apiType: 'string',
        required: true,
        descriptionCs: 'Oficiální obchodní firma nebo název společnosti zapsaný v rejstříku.',
        descriptionEn: 'Official legal registered entity name or brand trading name.',
        example: 'Alza e-commerce a.s.'
      },
      {
        name: 'address',
        sqlType: 'TEXT',
        apiType: 'string',
        required: false,
        descriptionCs: 'Úplná poštovní adresa sídla (ulice, číslo, PSČ, město).',
        descriptionEn: 'Full postal street address of company headquarters.',
        example: 'Jankovcova 1522/53, 170 00 Praha 7 - Holešovice'
      },
      {
        name: 'country',
        sqlType: 'VARCHAR(100)',
        apiType: 'string',
        required: false,
        descriptionCs: 'Stát sídla společnosti (výchozí: Czechia).',
        descriptionEn: 'Country of incorporation or headquarters (default: Czechia).',
        example: 'Czechia'
      },
      {
        name: 'region',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (enum)',
        required: true,
        allowedValues: ['SK_CZ', 'CEE', 'DACH', 'EUROPE', 'WORLD'],
        descriptionCs: 'Geografický obchodní region pro alokaci a filtraci v CRM.',
        descriptionEn: 'Commercial geographic region used for territory routing and filtering.',
        example: 'SK_CZ'
      },
      {
        name: 'segment',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK)',
        required: false,
        foreignKey: 'segments.id',
        descriptionCs: 'Obor podnikání firmy, odkazuje na číselník segmentů.',
        descriptionEn: 'Business industry segment, referencing the segments lookup dictionary.',
        example: 'electronics'
      },
      {
        name: 'email',
        sqlType: 'VARCHAR(100)',
        apiType: 'string (email)',
        required: false,
        descriptionCs: 'Hlavní firemní e-mail. Klíčové pole pro striktní párování e-mailové synchronizace.',
        descriptionEn: 'Primary corporate email address. Crucial field for strict email sync matching.',
        example: 'info@alza.cz'
      },
      {
        name: 'phone',
        sqlType: 'VARCHAR(50)',
        apiType: 'string',
        required: false,
        descriptionCs: 'Hlavní telefonní kontakt (národní číslo bez předvolby).',
        descriptionEn: 'Main phone number without international prefix.',
        example: '225340111'
      },
      {
        name: 'phonePrefix',
        sqlType: 'VARCHAR(20)',
        apiType: 'string',
        required: false,
        descriptionCs: 'Mezinárodní telefonní předvolba (např. +420, +421).',
        descriptionEn: 'International dialing country code prefix (e.g. +420, +421).',
        example: '+420'
      },
      {
        name: 'urls',
        sqlType: 'JSON',
        apiType: 'array of strings (URLs)',
        required: false,
        descriptionCs: 'Seznam webových stránek a e-shopů provozovaných firmou.',
        descriptionEn: 'Array of domain URLs and e-shops operated by the company.',
        example: ['https://www.alza.cz', 'https://www.alza.sk']
      },
      {
        name: 'contacts',
        sqlType: 'JSON',
        apiType: 'array of Contact objects',
        required: false,
        descriptionCs: 'Vnořený seznam kontaktních osob dané společnosti.',
        descriptionEn: 'Embedded array of contact person records belonging to this company.',
        example: [
          {
            id: 'cont-01',
            name: 'Jan Novák',
            position: 'Head of Logistics',
            email: 'jan.novak@alza.cz',
            phone: '777123456',
            phonePrefix: '+420',
            isActive: true,
            doNotContact: false
          }
        ]
      },
      {
        name: 'isActive',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: true,
        descriptionCs: 'Příznak aktivního záznamu (true) vs. archivovaného (false).',
        descriptionEn: 'Boolean flag indicating whether company record is active (true) or archived (false).',
        example: true
      },
      {
        name: 'isVisible',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: false,
        descriptionCs: 'Příznak viditelnosti pro běžné role (CSO oprávnění skrýt záznam).',
        descriptionEn: 'Visibility flag toggle for standard roles (CSO security override).',
        example: true
      }
    ],
    exampleJson: {
      id: 'comp-782a9f1b-4c22-48a0-9c12-ef5b77823e41',
      companyId: '27182818',
      name: 'Alza e-commerce a.s.',
      address: 'Jankovcova 1522/53, 170 00 Praha 7',
      country: 'Czechia',
      region: 'SK_CZ',
      segment: 'electronics',
      email: 'info@alza.cz',
      phone: '225340111',
      phonePrefix: '+420',
      urls: ['https://www.alza.cz'],
      isActive: true,
      contacts: [
        {
          id: 'cont-319a',
          name: 'Jan Novák',
          position: 'Head of Logistics',
          email: 'jan.novak@alza.cz',
          phone: '777123456',
          phonePrefix: '+420',
          isActive: true,
          doNotContact: false
        }
      ]
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(50) PRIMARY KEY,
  companyId VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  country VARCHAR(100) DEFAULT 'Czechia',
  region VARCHAR(50) NOT NULL,
  segment VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(50),
  phonePrefix VARCHAR(20) DEFAULT '+420',
  isActive BOOLEAN DEFAULT TRUE,
  isVisible BOOLEAN DEFAULT TRUE,
  urls JSON,
  contacts JSON
);`
  },
  {
    id: 'deals',
    tableName: 'deals',
    nameCs: 'Obchodní případ / Příležitost (Deal / Opportunity)',
    nameEn: 'Deal / Commercial Opportunity',
    descriptionCs: 'Ústřední entita obchodního procesu. Eviduje stav v pipeline (1. Lead až 6. Farming), odpovědné garanty, logistické parametry, smluvní data a data integrace.',
    descriptionEn: 'Core business entity of the sales cycle. Tracks stage in the pipeline (1. Lead to 6. Farming), assigned role owners, logistics attributes, contracts, and onboarding dates.',
    primaryKey: 'id',
    relationsCs: 'Vazba N:1 na Firmu (companyId -> companies.id), N:1 na Uživatele (hunterId, closerId, farmerId, createdBy -> users.id), N:1 na Číselníky.',
    relationsEn: 'N:1 relation to Company (companyId -> companies.id), N:1 to Users (hunterId, closerId, farmerId, createdBy -> users.id), N:1 to Lookups.',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní primární klíč obchodního případu.',
        descriptionEn: 'Unique primary key of the commercial deal.',
        example: 'deal-91823a-4421-4f11-9a41-cb1209341100'
      },
      {
        name: 'companyId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK)',
        required: true,
        foreignKey: 'companies.id',
        descriptionCs: 'Odkaz na mateřskou firmu / společnost.',
        descriptionEn: 'Foreign key reference to parent company (companies.id).',
        example: 'comp-782a9f1b-4c22-48a0-9c12-ef5b77823e41'
      },
      {
        name: 'stage',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (enum)',
        required: true,
        allowedValues: ['opportunity', 'lead', 'discovery_proposal', 'contracting', 'onboarding', 'farming', 'lost'],
        descriptionCs: 'Aktuální fáze pipeline: opportunity (1. Lead), lead (2. Oportunita / SQL), discovery_proposal (3. Discovery & Ponuka), contracting (4. Contracting), onboarding (5. Onboarding), farming (6. Farming), lost (7. Lost / Postponed).',
        descriptionEn: 'Current pipeline stage: opportunity (1. Lead), lead (2. Opportunity / SQL), discovery_proposal (3. Discovery), contracting (4. Contracting), onboarding (5. Onboarding), farming (6. Farming), lost (7. Lost).',
        example: 'lead'
      },
      {
        name: 'createdBy',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK)',
        required: true,
        foreignKey: 'users.id',
        descriptionCs: 'ID uživatele, který obchodní případ založil.',
        descriptionEn: 'User ID of the original deal creator (users.id).',
        example: 'usr-hunter-01'
      },
      {
        name: 'hunterId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'users.id',
        descriptionCs: 'Garant pro 1. a 2. fázi (Lead a Oportunita). Povinné pro posun z 1. fáze.',
        descriptionEn: 'Assigned Hunter owner for stages 1 & 2 (Lead & Opportunity). Mandatory for stage advancement.',
        example: 'usr-hunter-01'
      },
      {
        name: 'closerId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'users.id',
        descriptionCs: 'Garant pro 3. a 4. fázi (Discovery & Ponuka a Contracting). Povinné pro fázi 3.',
        descriptionEn: 'Assigned Closer owner for stages 3 & 4 (Discovery & Contracting). Mandatory for stage 3.',
        example: 'usr-closer-02'
      },
      {
        name: 'farmerId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'users.id',
        descriptionCs: 'Garant pro 5. a 6. fázi (Onboarding a Farming). Povinné pro fázi 5.',
        descriptionEn: 'Assigned Farmer account manager for stages 5 & 6 (Onboarding & Farming).',
        example: 'usr-farmer-03'
      },
      {
        name: 'leadSourceId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'lead_sources.id',
        descriptionCs: 'Zdroj akvizice ze systémového číselníku. Povinné pro fázi 2 (Oportunita).',
        descriptionEn: 'Acquisition lead source lookup ID. Mandatory for stage 2 (Opportunity).',
        example: 'web_inbound'
      },
      {
        name: 'ecommercePlatformId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'ecommerce_platforms.id',
        descriptionCs: 'E-commerce platforma klienta. Povinné pro fázi 2 (Oportunita).',
        descriptionEn: 'Client ecommerce platform identifier. Mandatory for stage 2 (Opportunity).',
        example: 'shoptet'
      },
      {
        name: 'storageTypeId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'storage_types.id',
        descriptionCs: 'Stávající způsob skladování (vlastní vs. pronajatý sklad).',
        descriptionEn: 'Existing storage methodology (own vs third-party fulfillment).',
        example: 'fulfillment'
      },
      {
        name: 'estimatedMonthlyParcels',
        sqlType: 'INT',
        apiType: 'number (integer)',
        required: false,
        descriptionCs: 'Odhadovaný měsíční počet zásilek. Povinné > 0 pro fázi 2 (Oportunita / SQL).',
        descriptionEn: 'Estimated monthly shipment volume. Mandatory > 0 for stage 2 (Opportunity / SQL).',
        example: 3500
      },
      {
        name: 'estimatedYearlyParcels',
        sqlType: 'INT',
        apiType: 'number (integer)',
        required: false,
        descriptionCs: 'Odhadovaný roční objem balíků pro fulfillment kalkulaci.',
        descriptionEn: 'Estimated annual parcel volume for logistics capacity planning.',
        example: 42000
      },
      {
        name: 'deliveryCountries',
        sqlType: 'JSON',
        apiType: 'array of strings (ISO Country Codes)',
        required: false,
        descriptionCs: 'Cílové země doručování zásilek. Povinné alespoň 1 země pro fázi 3 (Discovery).',
        descriptionEn: 'Target shipping destination countries. Mandatory at least 1 country for stage 3 (Discovery).',
        example: ['CZ', 'SK', 'HU', 'RO', 'DE']
      },
      {
        name: 'averageItemsPerOrder',
        sqlType: 'DECIMAL(10,2)',
        apiType: 'number (float)',
        required: false,
        descriptionCs: 'Průměrný počet kusů zboží v jedné objednávce. Povinné > 0 pro fázi 3.',
        descriptionEn: 'Average quantity of SKU items contained in a single order shipment. Mandatory > 0 for stage 3.',
        example: 2.4
      },
      {
        name: 'averageParcelWeight',
        sqlType: 'DECIMAL(10,2)',
        apiType: 'number (float)',
        required: false,
        descriptionCs: 'Průměrná váha jednoho balíku v kg. Povinné > 0 pro fázi 3.',
        descriptionEn: 'Average weight of an outgoing parcel in kilograms. Mandatory > 0 for stage 3.',
        example: 1.85
      },
      {
        name: 'averageParcelVolume',
        sqlType: 'INT',
        apiType: 'number (integer)',
        required: false,
        descriptionCs: 'Průměrný objem balíku (v cm³ nebo dm³). Povinné > 0 pro fázi 3.',
        descriptionEn: 'Average cubic volume of a parcel. Mandatory > 0 for stage 3.',
        example: 8500
      },
      {
        name: 'pricingOffers',
        sqlType: 'JSON',
        apiType: 'array of PricingOffer objects',
        required: false,
        descriptionCs: 'Seznam vystavených cenových nabídek v PDF. Povinná alespoň 1 pro fázi 3.',
        descriptionEn: 'Array of PDF pricing offer documents. Mandatory at least 1 offer for stage 3.',
        example: [
          {
            id: 'offer-1',
            filename: 'Cenova_nabidka_FHB_2026.pdf',
            url: '/uploads/offers/offer_123.pdf',
            dateSent: '2026-09-15T10:00:00.000Z',
            createdBy: 'usr-closer-02'
          }
        ]
      },
      {
        name: 'contractSignedDate',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC) or null',
        required: false,
        descriptionCs: 'Datum podpisu smlouvy o fulfillmentu. Povinné pro fázi 4 (Contracting).',
        descriptionEn: 'Date when the fulfillment contract was signed. Mandatory for stage 4 (Contracting).',
        example: '2026-09-28T00:00:00.000Z'
      },
      {
        name: 'pricingUploadedDate',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC) or null',
        required: false,
        descriptionCs: 'Datum nahrání podepsaného ceníku do systému. Povinné pro fázi 4 (Contracting).',
        descriptionEn: 'Date when approved pricing was uploaded into operations. Mandatory for stage 4.',
        example: '2026-09-28T12:00:00.000Z'
      },
      {
        name: 'itIntegrationId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'it_integrations.id',
        descriptionCs: 'Zvolený typ IT napojení. Povinné pro fázi 4 (Contracting).',
        descriptionEn: 'Selected IT integration technical bridge. Mandatory for stage 4.',
        example: 'rest_api'
      },
      {
        name: 'firstStockingDate',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC) or null',
        required: false,
        descriptionCs: 'Očekávané datum 1. závozu zboží na sklad. Povinné pro fázi 4 (Contracting).',
        descriptionEn: 'Anticipated initial inventory stocking date. Mandatory for stage 4.',
        example: '2026-10-15T08:00:00.000Z'
      },
      {
        name: 'itIntegrationCompletedDate',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC) or null',
        required: false,
        descriptionCs: 'Skutečné datum dokončení IT napojení. Povinné pro fázi 5 (Onboarding).',
        descriptionEn: 'Actual date when IT integration was completed. Mandatory for stage 5 (Onboarding).',
        example: '2026-10-12T16:30:00.000Z'
      },
      {
        name: 'firstStockingDateActual',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC) or null',
        required: false,
        descriptionCs: 'Skutečné datum fyzického 1. naskladnění. Povinné pro fázi 5 (Onboarding).',
        descriptionEn: 'Actual physical date when warehouse received inventory intake. Mandatory for stage 5.',
        example: '2026-10-14T11:00:00.000Z'
      },
      {
        name: 'integrationTestingCompletedDate',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC) or null',
        required: false,
        descriptionCs: 'Datum úspěšného dokončení UAT testů objednávek. Povinné pro fázi 5 (Onboarding).',
        descriptionEn: 'Date of verified completion of UAT testing on test shipments. Mandatory for stage 5.',
        example: '2026-10-15T15:00:00.000Z'
      },
      {
        name: 'createdAt',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC)',
        required: true,
        descriptionCs: 'Časové razítko vytvoření příležitosti v CRM.',
        descriptionEn: 'Timestamp of deal creation in CRM system.',
        example: '2026-09-01T08:30:00.000Z'
      },
      {
        name: 'updatedAt',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC)',
        required: true,
        descriptionCs: 'Časové razítko poslední změny či aktivity (klíčové pro restart lhůty neaktivity).',
        descriptionEn: 'Timestamp of last modification or activity (crucial for inactivity timer reset).',
        example: '2026-10-01T12:00:00.000Z'
      }
    ],
    exampleJson: {
      id: 'deal-91823a-4421-4f11-9a41-cb1209341100',
      companyId: 'comp-782a9f1b-4c22-48a0-9c12-ef5b77823e41',
      stage: 'lead',
      createdBy: 'usr-hunter-01',
      hunterId: 'usr-hunter-01',
      closerId: 'usr-closer-02',
      farmerId: null,
      leadSourceId: 'web_inbound',
      ecommercePlatformId: 'shoptet',
      storageTypeId: 'fulfillment',
      estimatedMonthlyParcels: 3500,
      estimatedYearlyParcels: 42000,
      deliveryCountries: ['CZ', 'SK', 'HU'],
      averageItemsPerOrder: 2.4,
      averageParcelWeight: 1.85,
      averageParcelVolume: 8500,
      createdAt: '2026-09-01T08:30:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z'
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS deals (
  id VARCHAR(50) PRIMARY KEY,
  companyId VARCHAR(50) NOT NULL,
  stage VARCHAR(50) NOT NULL,
  createdBy VARCHAR(50) NOT NULL,
  hunterId VARCHAR(50),
  closerId VARCHAR(50),
  farmerId VARCHAR(50),
  leadSourceId VARCHAR(50),
  ecommercePlatformId VARCHAR(50),
  storageTypeId VARCHAR(50),
  estimatedMonthlyParcels INT,
  estimatedYearlyParcels INT,
  seasonMonths JSON,
  skuCount INT,
  productsSold TEXT,
  codUsage JSON,
  b2cShare INT,
  deliveryCountries JSON,
  averageItemsPerOrder DECIMAL(10,2),
  averageParcelWeight DECIMAL(10,2),
  averageParcelVolume INT,
  pricingOffers JSON,
  documents JSON,
  contractSignedDate DATETIME,
  pricingUploadedDate DATETIME,
  itIntegrationId VARCHAR(50),
  firstStockingDate DATETIME,
  itIntegrationCompletedDate DATETIME,
  firstStockingDateActual DATETIME,
  integrationTestingCompletedDate DATETIME,
  postponedUntil DATETIME,
  postponedReason TEXT,
  postponedBy VARCHAR(50),
  postponedAt DATETIME,
  lostPermanently BOOLEAN DEFAULT FALSE,
  lostReason TEXT,
  lostReasonDetail TEXT,
  lostBy VARCHAR(50),
  lostAt DATETIME,
  lostFromStage VARCHAR(50),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_deals_companyId (companyId),
  INDEX idx_deals_stage (stage)
);`
  },
  {
    id: 'contacts',
    tableName: 'contacts (embedded v companies.contacts)',
    nameCs: 'Kontaktní osoba (Contact Person)',
    nameEn: 'Contact Person',
    descriptionCs: 'Zástupce klientské společnosti (jednatel, logistik, nákupčí). Slouží pro telefonickou a e-mailovou komunikaci a pro striktní párování příchozích a odchozích e-mailů k dealu.',
    descriptionEn: 'Company representative or executive (CEO, logistics head, buyer). Used for meetings, direct calls, and strict email sync pairing.',
    primaryKey: 'id',
    relationsCs: 'Vazba N:1 na Firmu (společnost je rodičem kontaktu).',
    relationsEn: 'N:1 relation to parent Company.',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní ID kontaktní osoby.',
        descriptionEn: 'Unique ID of the contact person.',
        example: 'cont-7182ba'
      },
      {
        name: 'name',
        sqlType: 'VARCHAR(100)',
        apiType: 'string',
        required: true,
        descriptionCs: 'Jméno a příjmení kontaktní osoby včetně akademických titulů.',
        descriptionEn: 'Full name and titles of the contact person.',
        example: 'Ing. Petr Dvořák'
      },
      {
        name: 'position',
        sqlType: 'VARCHAR(100)',
        apiType: 'string or FK',
        required: false,
        foreignKey: 'contact_positions.id',
        descriptionCs: 'Pracovní pozice ve firmě (odkaz na číselník nebo volný text).',
        descriptionEn: 'Job title / organizational position (references contact_positions lookup).',
        example: 'Head of Logistics'
      },
      {
        name: 'email',
        sqlType: 'VARCHAR(100)',
        apiType: 'string (email)',
        required: false,
        descriptionCs: 'Přímý e-mail. Klíčový údaj pro striktní synchronizaci pošty.',
        descriptionEn: 'Direct email address. Essential parameter for strict email synchronization.',
        example: 'petr.dvorak@klient.cz'
      },
      {
        name: 'phone',
        sqlType: 'VARCHAR(50)',
        apiType: 'string',
        required: false,
        descriptionCs: 'Telefonní číslo bez předvolby.',
        descriptionEn: 'Phone number without country code.',
        example: '608112233'
      },
      {
        name: 'phonePrefix',
        sqlType: 'VARCHAR(20)',
        apiType: 'string',
        required: false,
        descriptionCs: 'Mezinárodní předvolba (např. +420, +421).',
        descriptionEn: 'International dialing prefix.',
        example: '+420'
      },
      {
        name: 'isActive',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: true,
        descriptionCs: 'Příznak, zda osoba ve firmě stále působí.',
        descriptionEn: 'Active status flag indicating whether person is still employed at the company.',
        example: true
      },
      {
        name: 'doNotContact',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: false,
        descriptionCs: 'Příznak DNC (Klient si nepřeje být kontaktován).',
        descriptionEn: 'Do-Not-Contact (DNC) preference flag.',
        example: false
      }
    ],
    exampleJson: {
      id: 'cont-7182ba',
      name: 'Ing. Petr Dvořák',
      position: 'Head of Logistics',
      email: 'petr.dvorak@klient.cz',
      phone: '608112233',
      phonePrefix: '+420',
      isActive: true,
      doNotContact: false
    },
    sqlDdl: `-- Ukládáno jako JSON pole uvnitř tabulky companies(contacts):
-- Příklad struktury jednoho prvku v JSON poli:
{
  "id": "VARCHAR(50)",
  "name": "VARCHAR(100)",
  "position": "VARCHAR(100)",
  "email": "VARCHAR(100)",
  "phone": "VARCHAR(50)",
  "phonePrefix": "VARCHAR(20)",
  "isActive": true,
  "doNotContact": false
}`
  },
  {
    id: 'activities',
    tableName: 'activities',
    nameCs: 'Aktivita (Activity - Hovory, Schůzky, E-maily, Poznámky)',
    nameEn: 'Activity (Calls, Meetings, Emails, Notes)',
    descriptionCs: 'Zaznamenává veškerou interakci s klientem u dané příležitosti. Zahrnuje telefonáty, fyzické schůzky, videohovory přes MS Teams / Google Meet, synchronizované e-maily a interní poznámky.',
    descriptionEn: 'Records all customer interactions for an opportunity. Includes phone calls, meetings, MS Teams / Google Meet sessions, synchronized emails, and internal notes.',
    primaryKey: 'id',
    relationsCs: 'Vazba N:1 na Obchodní případ (dealId -> deals.id), N:1 na Autora (createdBy -> users.id).',
    relationsEn: 'N:1 relation to Deal (dealId -> deals.id), N:1 to Author (createdBy -> users.id).',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní primární klíč aktivity.',
        descriptionEn: 'Unique primary key of the activity.',
        example: 'act-9812-ccba-4819'
      },
      {
        name: 'dealId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK)',
        required: true,
        foreignKey: 'deals.id',
        descriptionCs: 'ID navázaného obchodního případu.',
        descriptionEn: 'Foreign key referencing associated deal (deals.id).',
        example: 'deal-91823a-4421-4f11-9a41-cb1209341100'
      },
      {
        name: 'type',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (enum)',
        required: true,
        allowedValues: ['call', 'meeting', 'teams', 'email'],
        descriptionCs: 'Typ aktivity: call (telefonát), meeting (osobní schůzka), teams (videohovor), email (synchronizovaný e-mail).',
        descriptionEn: 'Activity type: call, meeting, teams, email.',
        example: 'call'
      },
      {
        name: 'date',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC)',
        required: true,
        descriptionCs: 'Datum a čas konání aktivity. Pokud je datum v budoucnosti, odkládá odpočet neaktivity.',
        descriptionEn: 'Scheduled or executed activity datetime. Future events postpone inactivity timeout.',
        example: '2026-10-01T09:30:00.000Z'
      },
      {
        name: 'duration',
        sqlType: 'INT',
        apiType: 'number (minutes)',
        required: false,
        descriptionCs: 'Délka trvání aktivity v minutách.',
        descriptionEn: 'Duration of the event in minutes.',
        example: 25
      },
      {
        name: 'note',
        sqlType: 'TEXT',
        apiType: 'string',
        required: true,
        descriptionCs: 'Zápis z jednání, předmět a výňatek e-mailu nebo poznámka.',
        descriptionEn: 'Activity meeting summary, email subject & body excerpt, or internal note.',
        example: 'Úvodní hovor s jednatelem. Domluvena prezentace fulfillmentu na příští týden.'
      },
      {
        name: 'transcript',
        sqlType: 'TEXT',
        apiType: 'string or null',
        required: false,
        descriptionCs: 'Volitelný textový přepis audio záznamu hovoru.',
        descriptionEn: 'Optional transcribed speech text from call recording.',
        example: null
      },
      {
        name: 'meetingLink',
        sqlType: 'TEXT',
        apiType: 'string (URL) or null',
        required: false,
        descriptionCs: 'Odkaz na online videokonferenci (MS Teams nebo Google Meet).',
        descriptionEn: 'Online conference link (MS Teams URL or Google Meet link).',
        example: 'https://teams.microsoft.com/l/meetup-join/...'
      },
      {
        name: 'externalEventId',
        sqlType: 'VARCHAR(255)',
        apiType: 'string or null',
        required: false,
        descriptionCs: 'Externí ID z MS Graph Calendar / Gmail ID / InternetMessageId pro deduplikaci.',
        descriptionEn: 'External Microsoft Graph Event ID, Gmail ID, or Message-ID used for deduplication.',
        example: 'AAMkAGI2AAAU789x...'
      },
      {
        name: 'createdBy',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK)',
        required: true,
        foreignKey: 'users.id',
        descriptionCs: 'ID uživatele CRM, který aktivitu zaznamenal či synchronizoval.',
        descriptionEn: 'User ID of the CRM account who created or synced this record.',
        example: 'usr-hunter-01'
      },
      {
        name: 'createdAt',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC)',
        required: true,
        descriptionCs: 'Časové razítko zápisu aktivity do databáze.',
        descriptionEn: 'Creation timestamp of the record in CRM database.',
        example: '2026-10-01T09:35:00.000Z'
      }
    ],
    exampleJson: {
      id: 'act-9812-ccba-4819',
      dealId: 'deal-91823a-4421-4f11-9a41-cb1209341100',
      type: 'call',
      date: '2026-10-01T09:30:00.000Z',
      duration: 25,
      note: 'Úvodní hovor s jednatelem. Domluvena prezentace fulfillmentu na příští týden.',
      meetingLink: null,
      externalEventId: null,
      createdBy: 'usr-hunter-01',
      createdAt: '2026-10-01T09:35:00.000Z'
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(50) PRIMARY KEY,
  dealId VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  date DATETIME NOT NULL,
  duration INT DEFAULT 0,
  note TEXT NOT NULL,
  transcript TEXT,
  createdBy VARCHAR(50) NOT NULL,
  meetingLink TEXT,
  recordingLink VARCHAR(1000),
  meetingSummary TEXT,
  externalEventId VARCHAR(255),
  participants JSON,
  isVisible BOOLEAN DEFAULT TRUE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME,
  INDEX idx_activities_dealId (dealId),
  INDEX idx_activities_date (date)
);`
  },
  {
    id: 'users',
    tableName: 'users',
    nameCs: 'Uživatel (User & RBAC)',
    nameEn: 'User & Authentication',
    descriptionCs: 'Uživatelský účet obchodníka, manažera nebo administrátora. Obsahuje přiřazení do rolí (Hunter, Closer, Farmer, CSO, Admin) a stromové řízení nadřízených.',
    descriptionEn: 'System user account for sales rep, supervisor, or admin. Defines RBAC roles and organizational reporting hierarchy.',
    primaryKey: 'id',
    relationsCs: 'Vazba 1:N na Dealy (jako hunter, closer, farmer), 1:N na Aktivity, 1:N na Podřízené uživatele (managerId -> users.id).',
    relationsEn: '1:N relation to Deals (as hunter, closer, farmer), 1:N to Activities, 1:N to Subordinates (managerId -> users.id).',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní ID uživatele.',
        descriptionEn: 'Unique user identifier.',
        example: 'usr-hunter-01'
      },
      {
        name: 'name',
        sqlType: 'VARCHAR(100)',
        apiType: 'string',
        required: true,
        descriptionCs: 'Celé jméno a příjmení uživatele.',
        descriptionEn: 'Full legal name of the user.',
        example: 'Zdeněk Šmarda'
      },
      {
        name: 'email',
        sqlType: 'VARCHAR(100)',
        apiType: 'string (email)',
        required: true,
        descriptionCs: 'Přihlašovací e-mail uživatele. Používá se pro párování e-mailové synchronizace a auditu.',
        descriptionEn: 'Primary user email address. Used for authentication and strict email sync pairing.',
        example: 'zdenek.smarda@fhb.sk'
      },
      {
        name: 'role',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (enum)',
        required: true,
        allowedValues: ['hunter', 'closer', 'farmer', 'cso', 'administrator'],
        descriptionCs: 'Systémová role určující přístupová práva a odpovědnost za fáze pipeline.',
        descriptionEn: 'System security role controlling stage ownership and operational permissions.',
        example: 'hunter'
      },
      {
        name: 'managerId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'users.id',
        descriptionCs: 'ID přímého nadřízeného manažera (pro hierarchické dědění viditelnosti dealů).',
        descriptionEn: 'Direct supervisor user ID for hierarchical deal access inheritance.',
        example: 'admin-1'
      },
      {
        name: 'isActive',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: true,
        descriptionCs: 'Příznak aktivního účtu umožňujícího přihlášení do CRM.',
        descriptionEn: 'Active status flag enabling login access to the CRM.',
        example: true
      },
      {
        name: 'isTestAccount',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: false,
        descriptionCs: 'Příznak testovacího účtu (data tohoto účtu jsou vyloučena z manažerských KPI statistik).',
        descriptionEn: 'Test account flag (records are excluded from management KPI analytics).',
        example: false
      }
    ],
    exampleJson: {
      id: 'usr-hunter-01',
      name: 'Zdeněk Šmarda',
      email: 'zdenek.smarda@fhb.sk',
      role: 'hunter',
      managerId: 'admin-1',
      isActive: true,
      isTestAccount: false
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  managerId VARCHAR(50),
  isActive BOOLEAN DEFAULT TRUE,
  passwordHash TEXT NOT NULL,
  resetToken TEXT,
  resetTokenExpiry DATETIME,
  isTestAccount BOOLEAN DEFAULT FALSE,
  googleIntegration JSON,
  msIntegration JSON
);`
  },
  {
    id: 'stage_reminders',
    tableName: 'stage_reminders',
    nameCs: 'Stavová připomínka (Stage Reminder)',
    nameEn: 'Stage Inactivity Reminder Rule',
    descriptionCs: 'Konfigurace pravidel hlídání neaktivity pro jednotlivé fáze pipeline. Nastavuje limitní počet dnů nečinnosti, barvu orámování v Kanbanu a případný automatický e-mail.',
    descriptionEn: 'Configuration of stage inactivity warning rules. Configures elapsed day thresholds, Kanban border accents, and automated notification emails.',
    primaryKey: 'id',
    relationsCs: 'Vazba na fáze pipeline (stage).',
    relationsEn: 'Linked to pipeline stage definitions.',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní ID pravidla připomínky.',
        descriptionEn: 'Unique reminder rule ID.',
        example: 'rem-stage-01'
      },
      {
        name: 'stage',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (enum)',
        required: true,
        allowedValues: ['opportunity', 'lead', 'discovery_proposal', 'contracting', 'onboarding', 'farming'],
        descriptionCs: 'Cílová fáze pipeline, na kterou se pravidlo vztahuje.',
        descriptionEn: 'Target pipeline stage this reminder rule monitors.',
        example: 'opportunity'
      },
      {
        name: 'days',
        sqlType: 'INT',
        apiType: 'number (integer)',
        required: true,
        descriptionCs: 'Limitní počet dnů neaktivity (musí být splněny všechny 3 podmínky nečinnosti).',
        descriptionEn: 'Inactivity threshold in elapsed calendar days (all 3 conditions must be met).',
        example: 7
      },
      {
        name: 'color',
        sqlType: 'VARCHAR(20)',
        apiType: 'string (enum)',
        required: true,
        allowedValues: ['none', 'yellow', 'orange', 'red'],
        descriptionCs: 'Barva vizuálního zvýraznění karty v Kanban desce i Seznamu.',
        descriptionEn: 'Accent visual border color applied to deal cards in Kanban & List.',
        example: 'yellow'
      },
      {
        name: 'action',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (enum)',
        required: false,
        allowedValues: ['', 'email'],
        descriptionCs: 'Automatická akce při překročení limitu (email = ranní notifikační zpráva).',
        descriptionEn: 'Automated trigger action (email = automated 8:00 AM alert dispatch).',
        example: 'email'
      }
    ],
    exampleJson: {
      id: 'rem-stage-01',
      stage: 'opportunity',
      days: 7,
      color: 'yellow',
      action: 'email'
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS stage_reminders (
  id VARCHAR(50) PRIMARY KEY,
  stage VARCHAR(50) NOT NULL,
  days INT NOT NULL,
  action VARCHAR(50) DEFAULT '',
  color VARCHAR(20) DEFAULT 'none',
  INDEX idx_stage_reminders_stage (stage)
);`
  },
  {
    id: 'audit_logs',
    tableName: 'audit_logs',
    nameCs: 'Auditní záznam změn (Audit Trail)',
    nameEn: 'Audit Trail Log',
    descriptionCs: 'Nezměnitelná auditní stopa zaznamenávající každou změnu hodnoty pole u dealu i firmy, včetně autora změny a přesného časového razítka.',
    descriptionEn: 'Immutable audit trail recording every field-level change on deals and companies, logging actor, old/new values, and exact timestamp.',
    primaryKey: 'id',
    relationsCs: 'Vazba N:1 na Deal (dealId -> deals.id), N:1 na Uživatele (changedBy -> users.id).',
    relationsEn: 'N:1 to Deal (dealId -> deals.id), N:1 to User (changedBy -> users.id).',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (UUID)',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní ID auditního záznamu.',
        descriptionEn: 'Unique audit log entry ID.',
        example: 'aud-819a-9921'
      },
      {
        name: 'dealId',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK) or null',
        required: false,
        foreignKey: 'deals.id',
        descriptionCs: 'ID dotčeného obchodního případu.',
        descriptionEn: 'Target deal ID.',
        example: 'deal-91823a-4421-4f11-9a41-cb1209341100'
      },
      {
        name: 'field',
        sqlType: 'VARCHAR(50)',
        apiType: 'string',
        required: true,
        descriptionCs: 'Název změněného atributu (např. stage, hunterId, estimatedMonthlyParcels).',
        descriptionEn: 'Name of the modified field attribute.',
        example: 'stage'
      },
      {
        name: 'oldValue',
        sqlType: 'TEXT',
        apiType: 'string',
        required: false,
        descriptionCs: 'Původní hodnota pole před změnou (serializovaný řetězec).',
        descriptionEn: 'Previous attribute value before mutation.',
        example: 'opportunity'
      },
      {
        name: 'newValue',
        sqlType: 'TEXT',
        apiType: 'string',
        required: false,
        descriptionCs: 'Nová hodnota pole po změně.',
        descriptionEn: 'New updated attribute value.',
        example: 'lead'
      },
      {
        name: 'changedBy',
        sqlType: 'VARCHAR(50)',
        apiType: 'string (FK)',
        required: true,
        foreignKey: 'users.id',
        descriptionCs: 'ID uživatele, který změnu provedl, nebo "System".',
        descriptionEn: 'User ID of the mutating actor or "System".',
        example: 'usr-hunter-01'
      },
      {
        name: 'timestamp',
        sqlType: 'DATETIME',
        apiType: 'string (ISO 8601 UTC)',
        required: true,
        descriptionCs: 'Přesné časové razítko vzniku události.',
        descriptionEn: 'Exact event creation datetime timestamp.',
        example: '2026-10-01T10:15:00.000Z'
      }
    ],
    exampleJson: {
      id: 'aud-819a-9921',
      dealId: 'deal-91823a-4421-4f11-9a41-cb1209341100',
      field: 'stage',
      oldValue: 'opportunity',
      newValue: 'lead',
      changedBy: 'usr-hunter-01',
      timestamp: '2026-10-01T10:15:00.000Z'
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  dealId VARCHAR(50),
  companyId VARCHAR(50),
  field VARCHAR(50) NOT NULL,
  oldValue TEXT,
  newValue TEXT,
  changedBy VARCHAR(50) NOT NULL,
  timestamp DATETIME NOT NULL,
  INDEX idx_audit_logs_deal_field (dealId, field),
  INDEX idx_audit_logs_timestamp (timestamp)
);`
  },
  {
    id: 'enumerations',
    tableName: 'lead_sources, lost_reasons, segments, ecommerce_platforms, it_integrations, storage_types, contact_positions',
    nameCs: 'Systémové číselníky (Lookups & Dictionaries)',
    nameEn: 'System Lookup Enumerations',
    descriptionCs: 'Standardizované konfigurovatelné číselníky hodnot používané pro validaci a kategorizaci dat v celém CRM.',
    descriptionEn: 'Standardized configurable dictionary lookup tables used for data validation across the CRM.',
    primaryKey: 'id',
    relationsCs: 'Referencováno z tabulek deals, companies a contacts.',
    relationsEn: 'Referenced from deals, companies, and contacts tables.',
    fields: [
      {
        name: 'id',
        sqlType: 'VARCHAR(50)',
        apiType: 'string',
        required: true,
        isPrimaryKey: true,
        descriptionCs: 'Unikátní systémový identifikátor položky číselníku (např. shoptet, web, cold_call).',
        descriptionEn: 'Unique lookup code identifier (e.g. shoptet, web, cold_call).',
        example: 'shoptet'
      },
      {
        name: 'name',
        sqlType: 'VARCHAR(255)',
        apiType: 'string',
        required: true,
        descriptionCs: 'Uživatelský zobrazovaný název položky.',
        descriptionEn: 'Human-readable display title of the option.',
        example: 'Shoptet'
      },
      {
        name: 'isActive',
        sqlType: 'BOOLEAN',
        apiType: 'boolean',
        required: true,
        descriptionCs: 'Příznak aktivní položky (neaktivní položky nelze nově vybírat v formulářích).',
        descriptionEn: 'Active flag (deactivated options cannot be newly selected in forms).',
        example: true
      }
    ],
    exampleJson: {
      lead_sources: [
        { id: 'web', name: 'Webový formulář', isActive: true },
        { id: 'cold_call', name: 'Cold Call', isActive: true },
        { id: 'recommendation', name: 'Doporučení', isActive: true }
      ],
      ecommerce_platforms: [
        { id: 'shoptet', name: 'Shoptet', isActive: true },
        { id: 'woocommerce', name: 'WooCommerce', isActive: true },
        { id: 'custom_api', name: 'Vlastní API', isActive: true }
      ]
    },
    sqlDdl: `CREATE TABLE IF NOT EXISTS lead_sources (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS lost_reasons (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS segments (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS ecommerce_platforms (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS it_integrations (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS storage_types (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS contact_positions (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);`
  }
];
