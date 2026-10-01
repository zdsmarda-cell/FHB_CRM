import JSZip from 'jszip';
import { DATA_MODEL_ENTITIES, SchemaEntity } from '../data/dataModelSchema';

function escapeHtml(str: string | number | boolean | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCommonStyles(): string {
  return `
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --primary-light: #eef2ff;
      --primary-dark: #312e81;
      --gray-50: #f8fafc;
      --gray-100: #f1f5f9;
      --gray-200: #e2e8f0;
      --gray-300: #cbd5e1;
      --gray-400: #94a3b8;
      --gray-500: #64748b;
      --gray-600: #475569;
      --gray-700: #334155;
      --gray-800: #1e293b;
      --gray-900: #0f172a;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #0284c7;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-family);
      background-color: var(--gray-50);
      color: var(--gray-800);
      line-height: 1.5;
      display: flex;
      min-height: 100vh;
    }

    /* Layout */
    .sidebar {
      width: 280px;
      background-color: #ffffff;
      border-right: 1px solid var(--gray-200);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      overflow-y: auto;
      z-index: 10;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--gray-200);
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #ffffff;
    }

    .sidebar-header h2 {
      font-size: 1.15rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sidebar-header p {
      font-size: 0.75rem;
      color: #c7d2fe;
      margin-top: 4px;
    }

    .sidebar-nav {
      padding: 16px 12px;
      flex: 1;
    }

    .nav-group-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--gray-400);
      padding: 8px 10px 4px;
      margin-top: 12px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      font-size: 0.85rem;
      color: var(--gray-600);
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.15s ease;
      margin-bottom: 2px;
    }

    .nav-link:hover {
      background-color: var(--gray-100);
      color: var(--gray-900);
    }

    .nav-link.active {
      background-color: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
    }

    .main-wrapper {
      margin-left: 280px;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .top-header {
      background-color: #ffffff;
      border-bottom: 1px solid var(--gray-200);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .breadcrumbs {
      font-size: 0.825rem;
      color: var(--gray-500);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .breadcrumbs a {
      color: var(--primary);
      text-decoration: none;
    }

    .breadcrumbs a:hover {
      text-decoration: underline;
    }

    .content-container {
      padding: 32px;
      max-width: 1200px;
      width: 100%;
    }

    /* Cards & Sections */
    .card {
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid var(--gray-200);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      margin-bottom: 24px;
      overflow: hidden;
    }

    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--gray-200);
      background-color: #fafafa;
    }

    .card-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .card-body {
      padding: 24px;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--gray-900);
      margin-bottom: 6px;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gray-900);
      margin-bottom: 12px;
    }

    h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--gray-800);
      margin-bottom: 8px;
    }

    p {
      color: var(--gray-600);
      font-size: 0.925rem;
      line-height: 1.6;
    }

    /* Hero Banner */
    .hero-banner {
      background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4338ca 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 28px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }

    .hero-banner h1 {
      color: #ffffff;
      font-size: 2rem;
    }

    .hero-banner p {
      color: #e0e7ff;
      font-size: 1rem;
      max-width: 800px;
      margin-top: 8px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      font-size: 0.725rem;
      font-weight: 600;
      border-radius: 4px;
      font-family: var(--font-mono);
    }

    .badge-primary { background: #e0e7ff; color: #3730a3; }
    .badge-table { background: #1e1b4b; color: #e0e7ff; font-weight: 700; }
    .badge-pk { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-fk { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .badge-req { background: #fee2e2; color: #991b1b; }
    .badge-opt { background: #f1f5f9; color: #475569; }
    .badge-type { background: #e0f2fe; color: #0369a1; }

    /* Tables */
    .data-table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--gray-200);
      border-radius: 8px;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }

    table.data-table th {
      background-color: var(--gray-50);
      color: var(--gray-700);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid var(--gray-200);
      text-transform: uppercase;
      font-size: 0.725rem;
      letter-spacing: 0.05em;
    }

    table.data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--gray-200);
      vertical-align: top;
    }

    table.data-table tr:last-child td {
      border-bottom: none;
    }

    table.data-table tr:hover td {
      background-color: #f8fafc;
    }

    .field-name {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--gray-900);
      font-size: 0.875rem;
    }

    /* Code Blocks */
    pre.code-block {
      background-color: #0f172a;
      color: #e2e8f0;
      padding: 18px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 0.825rem;
      overflow-x: auto;
      line-height: 1.5;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.85em;
      background: var(--gray-100);
      padding: 2px 5px;
      border-radius: 4px;
      color: #be185d;
    }

    /* Entity Cards Grid on index page */
    .entity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .entity-card {
      background: #ffffff;
      border: 1px solid var(--gray-200);
      border-radius: 10px;
      padding: 20px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
    }

    .entity-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);
      border-color: #a5b4fc;
    }

    .entity-card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--gray-900);
      margin-top: 10px;
      margin-bottom: 6px;
    }

    .entity-card-desc {
      font-size: 0.825rem;
      color: var(--gray-600);
      flex: 1;
      line-height: 1.4;
    }

    .entity-card-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--gray-100);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.775rem;
      color: var(--primary);
      font-weight: 600;
    }

    /* Pagination / Next Entity */
    .entity-pagination {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--gray-200);
    }

    .pagination-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #ffffff;
      border: 1px solid var(--gray-300);
      border-radius: 8px;
      text-decoration: none;
      color: var(--gray-700);
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .pagination-btn:hover {
      background: var(--gray-50);
      border-color: var(--gray-400);
      color: var(--gray-900);
    }

    /* Print styling */
    @media print {
      .sidebar, .top-header, .entity-pagination { display: none !important; }
      .main-wrapper { margin-left: 0 !important; }
      body { background: #ffffff !important; }
      .card { box-shadow: none !important; border: 1px solid #ccc !important; }
    }

    @media (max-width: 900px) {
      .sidebar { display: none; }
      .main-wrapper { margin-left: 0; }
      .content-container { padding: 16px; }
    }
  `;
}

function buildSidebarHtml(currentPath: string, isCS: boolean, relativePrefix: string): string {
  const t = {
    overview: isCS ? 'Přehled & Architektura' : 'Overview & Architecture',
    entitiesGroup: isCS ? 'Databázové entity' : 'Database Entities',
    integrationGroup: isCS ? 'Specifikace & API' : 'Specification & API',
    apiGuide: isCS ? 'API integrační příručka' : 'API Integration Guide',
    sqlSchema: isCS ? 'Kompletní SQL DDL' : 'Complete SQL DDL',
    jsonSpec: isCS ? 'JSON Specifikace' : 'JSON Specification',
  };

  const entityLinks = DATA_MODEL_ENTITIES.map(entity => {
    const active = currentPath === `entities/${entity.id}.html` ? 'active' : '';
    const name = isCS ? entity.nameCs : entity.nameEn;
    return `
      <a href="${relativePrefix}entities/${entity.id}.html" class="nav-link ${active}">
        <span>●</span>
        <span>${escapeHtml(name.split('(')[0].trim())}</span>
      </a>
    `;
  }).join('');

  return `
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>
          <span>🗄️</span> FHB CRM
        </h2>
        <p>${isCS ? 'Datový model & API dokumentace' : 'Data Model & API Docs'}</p>
      </div>
      <nav class="sidebar-nav">
        <a href="${relativePrefix}index.html" class="nav-link ${currentPath === 'index.html' ? 'active' : ''}">
          <span>🏠</span>
          <span>${t.overview}</span>
        </a>

        <div class="nav-group-title">${t.entitiesGroup}</div>
        ${entityLinks}

        <div class="nav-group-title">${t.integrationGroup}</div>
        <a href="${relativePrefix}api_guide.html" class="nav-link ${currentPath === 'api_guide.html' ? 'active' : ''}">
          <span>🔌</span>
          <span>${t.apiGuide}</span>
        </a>
        <a href="${relativePrefix}database_schema.html" class="nav-link ${currentPath === 'database_schema.html' ? 'active' : ''}">
          <span>📋</span>
          <span>${t.sqlSchema}</span>
        </a>
        <a href="${relativePrefix}fhb-crm-spec.json" target="_blank" class="nav-link">
          <span>📦</span>
          <span>${t.jsonSpec}</span>
        </a>
      </nav>
    </aside>
  `;
}

function buildIndexHtml(isCS: boolean): string {
  const cardsHtml = DATA_MODEL_ENTITIES.map(entity => {
    const name = isCS ? entity.nameCs : entity.nameEn;
    const desc = isCS ? entity.descriptionCs : entity.descriptionEn;
    const reqCount = entity.fields.filter(f => f.required).length;
    return `
      <a href="entities/${entity.id}.html" class="entity-card">
        <div>
          <span class="badge badge-table">TABLE: ${escapeHtml(entity.tableName.split(',')[0].trim())}</span>
          <span class="badge badge-pk" style="margin-left: 6px;">PK: ${escapeHtml(entity.primaryKey)}</span>
        </div>
        <div class="entity-card-title">${escapeHtml(name)}</div>
        <div class="entity-card-desc">${escapeHtml(desc)}</div>
        <div class="entity-card-footer">
          <span>${entity.fields.length} ${isCS ? 'atributů' : 'fields'} (${reqCount} ${isCS ? 'povinných' : 'required'})</span>
          <span>${isCS ? 'Zobrazit detail →' : 'View Details →'}</span>
        </div>
      </a>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${isCS ? 'cs' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isCS ? 'FHB CRM - Datový model & API specifikace' : 'FHB CRM - Data Model & API Specification'}</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  ${buildSidebarHtml('index.html', isCS, '')}

  <div class="main-wrapper">
    <header class="top-header">
      <div class="breadcrumbs">
        <span>FHB CRM</span>
        <span>/</span>
        <span>${isCS ? 'Datový model & API' : 'Data Model & API'}</span>
      </div>
      <div>
        <a href="fhb-crm-spec.json" download class="badge badge-primary" style="padding: 6px 12px; text-decoration: none;">
          ⬇ ${isCS ? 'Stáhnout fhb-crm-spec.json' : 'Download fhb-crm-spec.json'}
        </a>
      </div>
    </header>

    <main class="content-container">
      <div class="hero-banner">
        <h1>${isCS ? 'FHB CRM — Datový model & API specifikace' : 'FHB CRM — Data Model & API Specification'}</h1>
        <p>
          ${isCS 
            ? 'Oficiální podklad pro budoucí API komunikaci, výměnu dat mezi CRM systémy a integraci do fulfillmentového a logistického ekosystému FHB Group.'
            : 'Official specification for future API communication, data exchange between CRM systems, and integration into the FHB Group fulfillment & logistics ecosystem.'}
        </p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>${isCS ? 'Architektura a systémové zásady' : 'Architecture & Core Principles'}</h2>
        </div>
        <div class="card-body">
          <p style="margin-bottom: 16px;">
            ${isCS 
              ? 'Tento dokument definuje datové struktury, databázové schéma a komunikační protokoly interního systému FHB CRM. Datový model je navržen s ohledem na vysokou spolehlivost, striktní auditovatelnost obchodního procesu a snadnou rozšiřitelnost.'
              : 'This document defines the data structures, database schema, and communication protocols of the internal FHB CRM system. The data model is designed for high reliability, strict business process auditability, and seamless extensibility.'}
          </p>

          <div style="display: grid; grid-cols: 1; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px;">
            <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; border: 1px solid var(--gray-200);">
              <h3 style="color: var(--primary);">💾 ${isCS ? 'Relační SQL Schéma' : 'Relational SQL Schema'}</h3>
              <p style="font-size: 0.85rem;">
                ${isCS 
                  ? 'Kompatibilní s MySQL 8.0+, MariaDB 10.5+ i PostgreSQL. Podpora JSON datových sloupců pro kontakty, URL adresy a flexibilní atributy.'
                  : 'Compatible with MySQL 8.0+, MariaDB 10.5+, and PostgreSQL. JSON column support for contacts, website URLs, and dynamic attributes.'}
              </p>
            </div>
            <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; border: 1px solid var(--gray-200);">
              <h3 style="color: var(--primary);">🔄 ${isCS ? 'Striktní obousměrná výměna' : 'Strict Bi-directional Exchange'}</h3>
              <p style="font-size: 0.85rem;">
                ${isCS 
                  ? 'Unifikované REST API s podporou JSON payloadů (ISO 8601 časová razítka, UUID identifikátory, normalizované číselníky).'
                  : 'Unified REST API supporting JSON payloads (ISO 8601 timestamps, UUID identifiers, standardized lookup enumerations).'}
              </p>
            </div>
            <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; border: 1px solid var(--gray-200);">
              <h3 style="color: var(--primary);">🛡️ ${isCS ? 'Řízení přístupu (RBAC)' : 'Role-Based Access Control'}</h3>
              <p style="font-size: 0.85rem;">
                ${isCS 
                  ? 'Podpora rolí Hunter (Akvizice), Closer (Uzavírání smlouvy), Onboarding, CS, Farmer, Team Leader, CSO a Admin s hierarchií manažerů.'
                  : 'Full support for Hunter, Closer, Onboarding, CS, Farmer, Team Leader, CSO, and Admin roles with managerial tree hierarchy.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>${isCS ? 'Přehled datových entit' : 'Database Entities Overview'}</h2>
          <p>${isCS ? 'Kliknutím na entitu zobrazíte její kompletní tabulku polí, SQL DDL a ukázkový JSON payload.' : 'Click on any entity to view its field table, SQL DDL, and sample JSON payload.'}</p>
        </div>
        <div class="card-body">
          <div class="entity-grid">
            ${cardsHtml}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>${isCS ? 'Pipeline a stavy obchodních případů' : 'Pipeline Stages & Process'}</h2>
        </div>
        <div class="card-body">
          <p style="margin-bottom: 16px;">
            ${isCS 
              ? 'Každý obchodní případ (Deal) prochází definovanými fázemi. Mezi fázemi jsou vynucována přísná validační pravidla:'
              : 'Every commercial deal advances through standardized pipeline stages with strict transition validation:'}
          </p>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isCS ? 'Fáze' : 'Stage'}</th>
                  <th>${isCS ? 'Kód (ID)' : 'Code (ID)'}</th>
                  <th>${isCS ? 'Garant / Vlastník' : 'Owner Role'}</th>
                  <th>${isCS ? 'Podmínky pro posun do další fáze' : 'Transition Requirements'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>1. Lead (Zájemce)</b></td>
                  <td><code>opportunity</code></td>
                  <td><span class="badge badge-primary">Hunter</span></td>
                  <td>${isCS ? 'Přiřazený Hunter, vyplněné IČO v profilu firmy, alespoň 1 realizovaná aktivita (hovor, schůzka).' : 'Assigned Hunter, Company IČO, min 1 completed activity.'}</td>
                </tr>
                <tr>
                  <td><b>2. Oportunita (Kvalifikovaná příležitost / SQL)</b></td>
                  <td><code>lead</code></td>
                  <td><span class="badge badge-primary">Hunter</span></td>
                  <td>${isCS ? 'Vyplněný zdroj (leadSourceId), e-commerce platforma (ecommercePlatformId), odhadovaný měsíční počet zásilek (estimatedMonthlyParcels).' : 'leadSourceId, ecommercePlatformId, estimatedMonthlyParcels.'}</td>
                </tr>
                <tr>
                  <td><b>3. Discovery & Ponuka</b></td>
                  <td><code>discovery</code></td>
                  <td><span class="badge badge-primary">Hunter / Closer</span></td>
                  <td>${isCS ? 'Detailní logistické parametry, zaslaná kalkulace a cenová nabídka.' : 'Logistics parameters, proposal sent.'}</td>
                </tr>
                <tr>
                  <td><b>4. Zmluva (Smlouva)</b></td>
                  <td><code>contract</code></td>
                  <td><span class="badge badge-primary">Closer</span></td>
                  <td>${isCS ? 'Podpis smlouvy a výběr onboarding manažera.' : 'Contract signed, onboarding manager selected.'}</td>
                </tr>
                <tr>
                  <td><b>5. Onboarding</b></td>
                  <td><code>onboarding</code></td>
                  <td><span class="badge badge-primary">Onboarding Specialist</span></td>
                  <td>${isCS ? 'IT integrace, skladové naskladnění, testovací expedice.' : 'IT integration, inbound stock, pilot dispatch.'}</td>
                </tr>
                <tr>
                  <td><b>6. Farming</b></td>
                  <td><code>farming</code></td>
                  <td><span class="badge badge-primary">Customer Care / Farmer</span></td>
                  <td>${isCS ? 'Předání do rutinní péče, sledování SLA a retence.' : 'Routine client success, SLA & retention.'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;
}

function buildEntityHtml(entity: SchemaEntity, isCS: boolean): string {
  const name = isCS ? entity.nameCs : entity.nameEn;
  const desc = isCS ? entity.descriptionCs : entity.descriptionEn;
  const relations = isCS ? entity.relationsCs : entity.relationsEn;

  // Find previous and next entity
  const currentIndex = DATA_MODEL_ENTITIES.findIndex(e => e.id === entity.id);
  const prevEntity = currentIndex > 0 ? DATA_MODEL_ENTITIES[currentIndex - 1] : null;
  const nextEntity = currentIndex < DATA_MODEL_ENTITIES.length - 1 ? DATA_MODEL_ENTITIES[currentIndex + 1] : null;

  const rowsHtml = entity.fields.map(f => {
    const fDesc = isCS ? f.descriptionCs : f.descriptionEn;
    const isPk = f.isPrimaryKey;
    const fk = f.foreignKey;
    const reqBadge = f.required 
      ? `<span class="badge badge-req">${isCS ? 'Povinné' : 'Required'}</span>`
      : `<span class="badge badge-opt">${isCS ? 'Volitelné' : 'Optional'}</span>`;

    let badges = '';
    if (isPk) badges += ` <span class="badge badge-pk">PK</span>`;
    if (fk) badges += ` <span class="badge badge-fk">FK &rarr; ${escapeHtml(fk)}</span>`;

    let allowedHtml = '';
    if (f.allowedValues && f.allowedValues.length > 0) {
      allowedHtml = `<div style="margin-top: 4px; font-size: 0.75rem; color: var(--gray-600);"><b>${isCS ? 'Povolené hodnoty:' : 'Allowed:'}</b> ${f.allowedValues.map(v => `<code>${escapeHtml(v)}</code>`).join(', ')}</div>`;
    }

    const exampleStr = typeof f.example === 'object' 
      ? JSON.stringify(f.example)
      : String(f.example ?? '');

    return `
      <tr>
        <td>
          <div class="field-name">${escapeHtml(f.name)}</div>
          <div>${badges}</div>
        </td>
        <td><code class="badge badge-type">${escapeHtml(f.sqlType)}</code></td>
        <td><code>${escapeHtml(f.apiType)}</code></td>
        <td>${reqBadge}</td>
        <td>
          <div>${escapeHtml(fDesc)}</div>
          ${allowedHtml}
        </td>
        <td><code style="word-break: break-all;">${escapeHtml(exampleStr)}</code></td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${isCS ? 'cs' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} — FHB CRM</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  ${buildSidebarHtml(`entities/${entity.id}.html`, isCS, '../')}

  <div class="main-wrapper">
    <header class="top-header">
      <div class="breadcrumbs">
        <a href="../index.html">FHB CRM</a>
        <span>/</span>
        <span>${isCS ? 'Entity' : 'Entities'}</span>
        <span>/</span>
        <span>${escapeHtml(name.split('(')[0].trim())}</span>
      </div>
      <div>
        <span class="badge badge-table">TABLE: ${escapeHtml(entity.tableName)}</span>
        <span class="badge badge-pk" style="margin-left: 6px;">PK: ${escapeHtml(entity.primaryKey)}</span>
      </div>
    </header>

    <main class="content-container">
      <div class="card">
        <div class="card-header card-header-flex">
          <div>
            <h1>${escapeHtml(name)}</h1>
            <p style="font-size: 1rem; color: var(--gray-700); margin-top: 4px;">${escapeHtml(desc)}</p>
            <div style="margin-top: 10px; font-size: 0.85rem; color: var(--primary);">
              <b>🔗 ${isCS ? 'Relační vazby:' : 'Relationships:'}</b> ${escapeHtml(relations)}
            </div>
          </div>
        </div>

        <div class="card-body">
          <h2>${isCS ? 'Tabulka atributů a datových typů' : 'Field Attributes & Data Types'}</h2>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isCS ? 'Atribut (Pole)' : 'Field (Attribute)'}</th>
                  <th>${isCS ? 'SQL Typ' : 'SQL Type'}</th>
                  <th>${isCS ? 'API / JSON Typ' : 'API / JSON Type'}</th>
                  <th>${isCS ? 'Povinnost' : 'Required'}</th>
                  <th>${isCS ? 'Popis & Omezení' : 'Description & Constraints'}</th>
                  <th>${isCS ? 'Příklad hodnoty' : 'Sample Value'}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>${isCS ? 'Vzorový JSON payload pro API výměnu' : 'Sample JSON Payload for API Exchange'}</h2>
          <p>${isCS ? 'Formát těla požadavku/odpovědi při komunikaci přes REST API s externím CRM.' : 'Request/Response body format when exchanging data via REST API.'}</p>
        </div>
        <div class="card-body">
          <pre class="code-block"><code>${escapeHtml(JSON.stringify(entity.exampleJson, null, 2))}</code></pre>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>${isCS ? 'SQL DDL Schéma (CREATE TABLE)' : 'SQL DDL Schema (CREATE TABLE)'}</h2>
          <p>${isCS ? 'Databázový příkaz pro vytvoření tabulky včetně primárních a cizích klíčů.' : 'Database DDL statement to provision table schema with keys.'}</p>
        </div>
        <div class="card-body">
          <pre class="code-block"><code>${escapeHtml(entity.sqlDdl)}</code></pre>
        </div>
      </div>

      <div class="entity-pagination">
        ${prevEntity ? `
          <a href="${prevEntity.id}.html" class="pagination-btn">
            &larr; ${escapeHtml(isCS ? prevEntity.nameCs.split('(')[0].trim() : prevEntity.nameEn.split('(')[0].trim())}
          </a>
        ` : `<div></div>`}

        ${nextEntity ? `
          <a href="${nextEntity.id}.html" class="pagination-btn">
            ${escapeHtml(isCS ? nextEntity.nameCs.split('(')[0].trim() : nextEntity.nameEn.split('(')[0].trim())} &rarr;
          </a>
        ` : `<div></div>`}
      </div>
    </main>
  </div>
</body>
</html>`;
}

function buildApiGuideHtml(isCS: boolean): string {
  return `<!DOCTYPE html>
<html lang="${isCS ? 'cs' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isCS ? 'API integrační příručka — FHB CRM' : 'API Integration Guide — FHB CRM'}</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  ${buildSidebarHtml('api_guide.html', isCS, '')}

  <div class="main-wrapper">
    <header class="top-header">
      <div class="breadcrumbs">
        <a href="index.html">FHB CRM</a>
        <span>/</span>
        <span>${isCS ? 'API Integrační příručka' : 'API Integration Guide'}</span>
      </div>
    </header>

    <main class="content-container">
      <div class="hero-banner">
        <h1>${isCS ? 'API Integrační příručka pro CRM výměnu dat' : 'API Integration Guide for CRM Data Exchange'}</h1>
        <p>
          ${isCS 
            ? 'Technická specifikace komunikačních endpointů, autentizace, chybových kódů a datové synchronizace mezi FHB CRM a externími systémy.'
            : 'Technical specification of endpoints, authentication, error formats, and data synchronization with external CRM systems.'}
        </p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>1. ${isCS ? 'Autentizace a bezpečnost' : 'Authentication & Security'}</h2>
        </div>
        <div class="card-body">
          <p>
            ${isCS 
              ? 'Veškerá komunikace s API probíhá výhradně šifrovaně přes HTTPS. Každý požadavek musí obsahovat Bearer JWT token v hlavičce Authorization:'
              : 'All API communication must be encrypted over HTTPS. Every HTTP request requires a Bearer JWT token in the Authorization header:'}
          </p>
          <pre class="code-block"><code>Authorization: Bearer &lt;JWT_API_TOKEN&gt;
Content-Type: application/json; charset=utf-8
Accept: application/json</code></pre>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>2. ${isCS ? 'Klíčové REST Endpointy' : 'Core REST Endpoints'}</h2>
        </div>
        <div class="card-body">
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>${isCS ? 'Popis operace' : 'Description'}</th>
                  <th>${isCS ? 'Oprávněné role' : 'Authorized Roles'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge badge-req" style="background:#dcfce7; color:#166534;">GET</span></td>
                  <td><code>/api/companies</code></td>
                  <td>${isCS ? 'Seznam klientských organizací (s podporou stránkování a filtrování).' : 'List client companies with paging and filtering.'}</td>
                  <td>Hunter, Closer, CS, Admin</td>
                </tr>
                <tr>
                  <td><span class="badge badge-pk" style="background:#e0e7ff; color:#3730a3;">POST</span></td>
                  <td><code>/api/companies</code></td>
                  <td>${isCS ? 'Založení nové společnosti (vyžaduje IČO, název, region).' : 'Create new company record (requires IČO, name, region).'}</td>
                  <td>Hunter, Admin</td>
                </tr>
                <tr>
                  <td><span class="badge badge-req" style="background:#dcfce7; color:#166534;">GET</span></td>
                  <td><code>/api/deals</code></td>
                  <td>${isCS ? 'Seznam obchodních případů včetně fáze, garanta a logistických parametrů.' : 'List commercial deals including stage and logistics metrics.'}</td>
                  <td>Všechny obchodní role</td>
                </tr>
                <tr>
                  <td><span class="badge badge-pk" style="background:#e0e7ff; color:#3730a3;">POST</span></td>
                  <td><code>/api/deals</code></td>
                  <td>${isCS ? 'Založení nového dealu (ve fázi 1. Lead).' : 'Create new commercial deal in stage 1 (Lead).'}</td>
                  <td>Hunter, Admin</td>
                </tr>
                <tr>
                  <td><span class="badge badge-pk" style="background:#fef3c7; color:#92400e;">PUT</span></td>
                  <td><code>/api/deals/:id</code></td>
                  <td>${isCS ? 'Aktualizace dealu a posun do vyšší fáze (kontrola validačních podmínek).' : 'Update deal or advance stage (with strict validation).'}</td>
                  <td>Garant dealu, Manager, Admin</td>
                </tr>
                <tr>
                  <td><span class="badge badge-pk" style="background:#e0e7ff; color:#3730a3;">POST</span></td>
                  <td><code>/api/activities</code></td>
                  <td>${isCS ? 'Záznam nové aktivity (hovor, schůzka, zápis) a restart hlídání neaktivity.' : 'Log new activity and reset stage inactivity countdown.'}</td>
                  <td>Všechny role</td>
                </tr>
                <tr>
                  <td><span class="badge badge-req" style="background:#dcfce7; color:#166534;">GET</span></td>
                  <td><code>/api/users</code></td>
                  <td>${isCS ? 'Seznam aktivních uživatelů a obchodníků (pro alokaci garantů).' : 'List active users for deal owner allocation.'}</td>
                  <td>Všechny role</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>3. ${isCS ? 'Formát standardní chybové odpovědi' : 'Standard Error Response Format'}</h2>
        </div>
        <div class="card-body">
          <p>${isCS ? 'Všechny chyby vracejí konzistentní JSON payload se stavovým kódem HTTP 4xx nebo 5xx:' : 'All API errors return consistent JSON payloads with HTTP 4xx/5xx status:'}</p>
          <pre class="code-block"><code>{
  "success": false,
  "error": "IČ (IČO) je od stavu Lead povinné a musí být vyplněno.",
  "code": "VALIDATION_FAILED",
  "field": "companyId",
  "timestamp": "2026-10-01T14:30:00.000Z"
}</code></pre>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;
}

function buildDatabaseSchemaHtml(isCS: boolean): string {
  const fullSql = DATA_MODEL_ENTITIES.map(e => `-- Table: ${e.tableName}\n${e.sqlDdl}`).join('\n\n');

  return `<!DOCTYPE html>
<html lang="${isCS ? 'cs' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isCS ? 'SQL DDL Schéma databáze — FHB CRM' : 'Database SQL DDL Schema — FHB CRM'}</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  ${buildSidebarHtml('database_schema.html', isCS, '')}

  <div class="main-wrapper">
    <header class="top-header">
      <div class="breadcrumbs">
        <a href="index.html">FHB CRM</a>
        <span>/</span>
        <span>${isCS ? 'SQL Schéma databáze' : 'Database SQL DDL'}</span>
      </div>
    </header>

    <main class="content-container">
      <div class="hero-banner">
        <h1>${isCS ? 'Kompletní SQL DDL Schéma' : 'Complete SQL DDL Schema'}</h1>
        <p>
          ${isCS 
            ? 'Skript pro kompletní inicializaci a migraci relační databáze FHB CRM (MySQL 8.0+, MariaDB 10.5+, PostgreSQL).'
            : 'Unified DDL script to initialize and migrate the relational database of FHB CRM.'}
        </p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>${isCS ? 'SQL Inicializační skript (schema.sql)' : 'SQL Initialization Script (schema.sql)'}</h2>
          <p>${isCS ? 'Můžete zkopírovat a spustit v libovolném SQL klientovi (DBeaver, phpMyAdmin, MySQL Workbench).' : 'Ready to execute in any SQL client or migration tool.'}</p>
        </div>
        <div class="card-body">
          <pre class="code-block"><code>${escapeHtml(fullSql)}</code></pre>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;
}

export async function generateDocZip(isCS: boolean): Promise<Blob> {
  const zip = new JSZip();

  // 1. Root index.html
  zip.file('index.html', buildIndexHtml(isCS));

  // 2. Individual entity pages inside entities/
  const entitiesFolder = zip.folder('entities');
  if (entitiesFolder) {
    for (const entity of DATA_MODEL_ENTITIES) {
      entitiesFolder.file(`${entity.id}.html`, buildEntityHtml(entity, isCS));
    }
  }

  // 3. API Guide & Database Schema HTML pages
  zip.file('api_guide.html', buildApiGuideHtml(isCS));
  zip.file('database_schema.html', buildDatabaseSchemaHtml(isCS));

  // 4. Standalone plain files (schema.sql & fhb-crm-spec.json)
  const fullSql = DATA_MODEL_ENTITIES.map(e => `-- Table: ${e.tableName}\n${e.sqlDdl}`).join('\n\n');
  zip.file('schema.sql', fullSql);

  const fullSpecification = {
    title: 'FHB CRM - Data Model & API Specification',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: isCS 
      ? 'Kompletní specifikace datových entit, formátů a databázové struktury FHB CRM pro integraci a API výměnu dat mezi CRM systémy.' 
      : 'Complete data entities, storage formats, and database schema specification of FHB CRM for system integration and data exchange.',
    entities: DATA_MODEL_ENTITIES.map(entity => ({
      id: entity.id,
      tableName: entity.tableName,
      name: isCS ? entity.nameCs : entity.nameEn,
      description: isCS ? entity.descriptionCs : entity.descriptionEn,
      primaryKey: entity.primaryKey,
      relations: isCS ? entity.relationsCs : entity.relationsEn,
      fields: entity.fields.map(f => ({
        name: f.name,
        sqlType: f.sqlType,
        apiType: f.apiType,
        required: f.required,
        isPrimaryKey: f.isPrimaryKey || false,
        foreignKey: f.foreignKey || null,
        allowedValues: f.allowedValues || null,
        description: isCS ? f.descriptionCs : f.descriptionEn,
        example: f.example
      })),
      samplePayload: entity.exampleJson,
      sqlDdl: entity.sqlDdl
    }))
  };
  zip.file('fhb-crm-spec.json', JSON.stringify(fullSpecification, null, 2));

  // 5. README.txt inside zip for quick orientation
  const readmeText = isCS 
    ? `FHB CRM - Technická dokumentace datového modelu a API
==================================================

Obsah archivu fhbcrm_doc.zip:
1. index.html - Hlavní vstupní stránka klikací dokumentace (otevřete v libovolném prohlížeči).
2. entities/ - Samostatné HTML stránky pro každou entitu (firmy, dealy, kontakty, aktivity, uživatelé, lhůty, logy, číselníky).
3. api_guide.html - Kompletní příručka pro napojení a výměnu dat přes REST API.
4. database_schema.html - Přehledné zobrazení celého SQL schématu.
5. schema.sql - Čistý SQL skript pro inicializaci databáze v MySQL / MariaDB / PostgreSQL.
6. fhb-crm-spec.json - Strojově čitelná JSON specifikace všech entit a polí.

Vygenerováno systémem FHB CRM dne: ${new Date().toLocaleDateString('cs-CZ')}
`
    : `FHB CRM - Technical Data Model & API Documentation
====================================================

Contents of fhbcrm_doc.zip:
1. index.html - Main entry point of the interactive documentation (open in any web browser).
2. entities/ - Dedicated HTML pages for each entity (companies, deals, contacts, activities, users, reminders, logs, enumerations).
3. api_guide.html - Complete guide for REST API integration and data exchange.
4. database_schema.html - Comprehensive SQL schema view.
5. schema.sql - Raw SQL script for MySQL / MariaDB / PostgreSQL database setup.
6. fhb-crm-spec.json - Machine-readable JSON specification of all entities and fields.

Generated by FHB CRM on: ${new Date().toISOString()}
`;
  zip.file('README.txt', readmeText);

  return await zip.generateAsync({ type: 'blob' });
}
