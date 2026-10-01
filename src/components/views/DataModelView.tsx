import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Database, 
  Search, 
  Copy, 
  Check, 
  Download, 
  Code, 
  Table, 
  FileJson, 
  Layers, 
  ArrowRightLeft, 
  Key, 
  Link as LinkIcon,
  ShieldCheck,
  Building2,
  Briefcase,
  Users,
  Calendar,
  Clock,
  BookOpen
} from 'lucide-react';
import { DATA_MODEL_ENTITIES, SchemaEntity, SchemaField } from '../../data/dataModelSchema';

export const DataModelView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isCS = i18n.language === 'cs';

  const [selectedEntityId, setSelectedEntityId] = useState<string>('companies');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'table' | 'json' | 'sql'>('table');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedEntity = useMemo(() => {
    return DATA_MODEL_ENTITIES.find(e => e.id === selectedEntityId) || DATA_MODEL_ENTITIES[0];
  }, [selectedEntityId]);

  const filteredFields = useMemo(() => {
    if (!searchTerm.trim()) return selectedEntity.fields;
    const term = searchTerm.toLowerCase();
    return selectedEntity.fields.filter(f => 
      f.name.toLowerCase().includes(term) ||
      f.sqlType.toLowerCase().includes(term) ||
      f.apiType.toLowerCase().includes(term) ||
      (isCS ? f.descriptionCs.toLowerCase().includes(term) : f.descriptionEn.toLowerCase().includes(term))
    );
  }, [selectedEntity, searchTerm, isCS]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleExportAllJson = () => {
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

    const blob = new Blob([JSON.stringify(fullSpecification, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fhb-crm-data-model-${i18n.language}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getEntityIcon = (id: string) => {
    switch (id) {
      case 'companies': return <Building2 className="w-4 h-4" />;
      case 'deals': return <Briefcase className="w-4 h-4" />;
      case 'contacts': return <Users className="w-4 h-4" />;
      case 'activities': return <Calendar className="w-4 h-4" />;
      case 'users': return <ShieldCheck className="w-4 h-4" />;
      case 'stage_reminders': return <Clock className="w-4 h-4" />;
      case 'audit_logs': return <Layers className="w-4 h-4" />;
      case 'enumerations': return <BookOpen className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-6 h-6 text-indigo-300" />
            <h3 className="text-xl font-bold">
              {t('admin.dataModel', 'Datový model & API specifikace')}
            </h3>
          </div>
          <p className="text-indigo-200 text-sm max-w-2xl">
            {t('admin.dataModelSubtitle', 'Kompletní deskripce databázových entit, formátů a datových struktur pro integraci a API výměnu dat mezi CRM systémy.')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportAllJson}
            className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all shadow-sm w-full md:w-auto"
          >
            <Download className="w-4 h-4" />
            {t('admin.dataModelExportJson', 'Stáhnout API specifikaci (JSON)')}
          </button>
        </div>
      </div>

      {/* Navigation Pills across entities */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {DATA_MODEL_ENTITIES.map(entity => {
          const isSelected = entity.id === selectedEntityId;
          return (
            <button
              key={entity.id}
              onClick={() => {
                setSelectedEntityId(entity.id);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {getEntityIcon(entity.id)}
              {isCS ? entity.nameCs : entity.nameEn}
            </button>
          );
        })}
      </div>

      {/* Entity Details Card */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Entity Summary Bar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/70">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                  TABLE: {selectedEntity.tableName}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600 font-mono">
                  <Key className="w-3 h-3 text-amber-500" />
                  PK: {selectedEntity.primaryKey}
                </span>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mt-1.5">
                {isCS ? selectedEntity.nameCs : selectedEntity.nameEn}
              </h4>
              <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                {isCS ? selectedEntity.descriptionCs : selectedEntity.descriptionEn}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-indigo-700">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="font-semibold">{t('admin.dataModelRelations', 'Vazby')}:</span>
                <span>{isCS ? selectedEntity.relationsCs : selectedEntity.relationsEn}</span>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-200/80 p-1 rounded-lg">
              <button
                onClick={() => setActiveSubTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeSubTab === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                {t('admin.dataModelTabTable', 'Tabulka polí')}
              </button>
              <button
                onClick={() => setActiveSubTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeSubTab === 'json' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                {t('admin.dataModelTabJson', 'Vzorový JSON')}
              </button>
              <button
                onClick={() => setActiveSubTab('sql')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeSubTab === 'sql' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                SQL DDL
              </button>
            </div>
          </div>

          {/* Search Field Filter */}
          {activeSubTab === 'table' && (
            <div className="mt-4 pt-4 border-t border-gray-200/60 flex items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('admin.dataModelSearchPlaceholder', 'Hledat pole, typ či popis...')}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  {t('common.clear', 'Zrušit')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* View Mode 1: Table of Fields */}
        {activeSubTab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[11px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t('admin.dataModelField', 'Pole (Atribut)')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.dataModelSqlType', 'SQL Typ')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.dataModelApiType', 'API / JSON Typ')}</th>
                  <th className="px-3 py-3 font-semibold text-center">{t('admin.dataModelRequired', 'Povinnost')}</th>
                  <th className="px-5 py-3 font-semibold">{t('admin.dataModelDescription', 'Popis & Omezení')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.dataModelExample', 'Příklad hodnoty')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredFields.map(field => (
                  <tr key={field.name} className="hover:bg-gray-50/80 transition-colors">
                    {/* Field Name */}
                    <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-indigo-700 font-semibold">{field.name}</span>
                        {field.isPrimaryKey && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                            <Key className="w-2.5 h-2.5" /> PK
                          </span>
                        )}
                        {field.foreignKey && (
                          <span 
                            title={`Foreign Key -> ${field.foreignKey}`}
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5"
                          >
                            <LinkIcon className="w-2.5 h-2.5" /> FK
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SQL Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {field.sqlType}
                      </span>
                    </td>

                    {/* API Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                        field.apiType.includes('UUID') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        field.apiType.includes('ISO') ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                        field.apiType.includes('number') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        field.apiType.includes('boolean') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        field.apiType.includes('array') ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {field.apiType}
                      </span>
                    </td>

                    {/* Required */}
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {field.required ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                          {t('admin.dataModelRequiredYes', 'Povinné')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600">
                          {t('admin.dataModelRequiredNo', 'Volitelné')}
                        </span>
                      )}
                    </td>

                    {/* Description & Constraints */}
                    <td className="px-5 py-3.5 text-gray-700 leading-relaxed min-w-[280px]">
                      <p>{isCS ? field.descriptionCs : field.descriptionEn}</p>
                      {field.foreignKey && (
                        <p className="text-[11px] text-blue-600 font-mono mt-0.5">
                          → {field.foreignKey}
                        </p>
                      )}
                      {field.allowedValues && field.allowedValues.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[10px] text-gray-500 mr-1">{isCS ? 'Povolené hodnoty:' : 'Allowed values:'}</span>
                          {field.allowedValues.map(val => (
                            <code key={val} className="px-1 py-0.2 bg-gray-100 text-indigo-700 rounded text-[10px] border border-gray-200">
                              '{val}'
                            </code>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Example */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      {field.example === null ? (
                        <span className="text-gray-400 italic">null</span>
                      ) : typeof field.example === 'object' ? (
                        <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => setActiveSubTab('json')}>
                          {JSON.stringify(field.example).slice(0, 30)}...
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">{String(field.example)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: Sample JSON Payload */}
        {activeSubTab === 'json' && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h5 className="text-sm font-bold text-gray-900">
                  {t('admin.dataModelPayloadExample', 'Vzorový JSON payload pro API komunikaci')}
                </h5>
                <p className="text-xs text-gray-500">
                  {isCS 
                    ? 'Tento formát reprezentuje standardizovaný JSON objekt pro import/export dat mezi CRM systémy.' 
                    : 'This payload represents the standardized JSON structure for data exchange between CRM systems.'}
                </p>
              </div>

              <button
                onClick={() => handleCopy(JSON.stringify(selectedEntity.exampleJson, null, 2), 'json-payload')}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1.5 rounded-lg border border-gray-300 font-medium transition-colors"
              >
                {copiedKey === 'json-payload' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">{t('admin.dataModelCopied', 'Zkopírováno!')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    {t('admin.dataModelCopyJson', 'Kopírovat JSON')}
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-gray-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px]">
              {JSON.stringify(selectedEntity.exampleJson, null, 2)}
            </pre>
          </div>
        )}

        {/* View Mode 3: SQL DDL */}
        {activeSubTab === 'sql' && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h5 className="text-sm font-bold text-gray-900">
                  {t('admin.dataModelSqlDdl', 'SQL DDL (CREATE TABLE schématu)')}
                </h5>
                <p className="text-xs text-gray-500">
                  {isCS 
                    ? 'MySQL / MariaDB definice tabulky včetně datových typů, indexů a klíčů.' 
                    : 'MySQL / MariaDB table definition including data types, indexes, and constraints.'}
                </p>
              </div>

              <button
                onClick={() => handleCopy(selectedEntity.sqlDdl, 'sql-ddl')}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1.5 rounded-lg border border-gray-300 font-medium transition-colors"
              >
                {copiedKey === 'sql-ddl' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">{t('admin.dataModelCopied', 'Zkopírováno!')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    {t('admin.dataModelCopySql', 'Kopírovat SQL')}
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-gray-900 text-blue-300 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              {selectedEntity.sqlDdl}
            </pre>
          </div>
        )}
      </div>

      {/* Integration Notes / Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-blue-900 text-xs leading-relaxed space-y-2">
        <h5 className="font-bold text-sm text-blue-950 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          {isCS ? 'Zásady pro externí API integraci a výměnu dat:' : 'External API Integration and Data Exchange Guidelines:'}
        </h5>
        <ul className="list-disc list-inside space-y-1.5 text-blue-800">
          <li>
            <b>{isCS ? 'Formát datumu a času:' : 'Datetime format:'}</b> {isCS ? 'Všechna časová razítka v API komunikaci musí být ve formátu ISO 8601 v UTC časové zóně (např. ' : 'All timestamps in API communication must strictly follow ISO 8601 UTC (e.g. '}<code>2026-10-01T12:00:00.000Z</code>).
          </li>
          <li>
            <b>{isCS ? 'Párování e-mailů u příležitosti:' : 'Opportunity email matching:'}</b> {isCS ? 'Pro automatické párování e-mailové korespondence k příležitosti je vyžadována existence shodné e-mailové adresy v profilu firmy (company.email) nebo v jejích kontaktech (contact.email) ve spojení s přihlášeným uživatelem CRM.' : 'Automated email pairing requires an exact email address match on the company profile (company.email) or its contacts (contact.email) combined with a CRM user address.'}
          </li>
          <li>
            <b>{isCS ? 'Podmínky posunu fází (Pipeline Rules):' : 'Pipeline Stage Rules:'}</b> {isCS ? 'Při externí aktualizaci fáze obchodu (deals.stage) doporučujeme dodržet validační pravidla (např. odhad balíků > 0, zdroj leadu a e-commerce platforma pro 2. fázi Oportunita), aby nedošlo k nekonzistenci v reportingu.' : 'When mutating deal stages externally, adhere to validation criteria (e.g. estimated parcels > 0, lead source, and ecommerce platform for 2. stage Opportunity) to prevent reporting discrepancies.'}
          </li>
          <li>
            <b>{isCS ? 'Auditní stopa:' : 'Audit Trail:'}</b> {isCS ? 'Veškeré změny atributů prováděné přes API rozhraní by měly paralelně vkládat záznam do tabulky ' : 'All field modifications executed via API should record a corresponding entry into '}<code>audit_logs</code> {isCS ? 'pro zachování sledovatelnosti.' : 'to preserve compliance traceability.'}
          </li>
        </ul>
      </div>
    </div>
  );
};
