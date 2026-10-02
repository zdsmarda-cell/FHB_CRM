import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, FileText, Image, FileSpreadsheet, File, AlertCircle, Clock, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { apiFetch } from '../../store';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  filename: string;
}

export function AttachmentModal({ isOpen, onClose, activityId, filename }: AttachmentModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const ext = (filename.split('.').pop() || '').toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isPdf = ext === 'pdf';

  useEffect(() => {
    if (!isOpen || !activityId || !filename) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      setError(null);
      setFileSize(null);
      setZoom(1);
      return;
    }

    let isSubscribed = true;

    async function loadAttachment() {
      setLoading(true);
      setError(null);
      setZoom(1);
      try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
        const url = `/api/activities/${activityId}/attachments/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
        const res = await apiFetch(url);

        if (!res.ok) {
          let errText = `Chyba při načítání přílohy (${res.status})`;
          try {
            const errJson = await res.json();
            if (res.status === 401 || errJson?.error === 'unauthorized') {
              errText = t('auth.sessionExpired', 'Platnost vašeho přihlášení vypršela nebo nemáte platné oprávnění. Přihlaste se prosím znovu.');
            } else if (errJson?.error || errJson?.message) {
              errText = errJson.error || errJson.message;
            }
          } catch {
            if (res.status === 401) {
              errText = t('auth.sessionExpired', 'Platnost vašeho přihlášení vypršela nebo nemáte platné oprávnění. Přihlaste se prosím znovu.');
            }
          }
          throw new Error(errText);
        }

        const blob = await res.blob();
        if (isSubscribed) {
          const url = URL.createObjectURL(blob);
          setObjectUrl(url);
          setFileSize(blob.size);
        }
      } catch (err: any) {
        console.error('Error loading attachment:', err);
        if (isSubscribed) {
          setError(err?.message || t('activities.downloadFailed', 'Přílohu se nepodařilo načíst ze serveru.'));
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    loadAttachment();

    return () => {
      isSubscribed = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, activityId, filename]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!objectUrl) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const renderIcon = () => {
    if (isImage) return <Image className="w-5 h-5 text-indigo-600" />;
    if (isPdf) return <FileText className="w-5 h-5 text-rose-600" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    return <File className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[120] transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative border border-gray-200 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate" title={filename}>
                {filename}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="uppercase font-medium tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  {ext || 'SOUBOR'}
                </span>
                {fileSize !== null && (
                  <>
                    <span>&bull;</span>
                    <span>{formatSize(fileSize)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && objectUrl && !loading && (
              <div className="hidden sm:flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 mr-2 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  title="Zmenšit"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-1.5 py-0.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors font-mono"
                  title="Obnovit zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  title="Zvětšit"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title={t('common.close', 'Zavřít')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-900/5 min-h-[250px] max-h-[70vh] flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <Clock className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">{t('activities.loadingAttachment', 'Načítání přílohy ze serveru...')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-3 max-w-md p-6 text-center bg-white rounded-xl border border-red-200 shadow-sm">
              <div className="p-3 bg-red-50 text-red-600 rounded-full">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-semibold text-gray-900">
                {t('activities.attachmentLoadFailed', 'Přílohu se nepodařilo načíst')}
              </h4>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && objectUrl && (
            <>
              {isImage && (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={objectUrl}
                    alt={filename}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md transition-transform duration-150 select-none bg-white"
                  />
                </div>
              )}

              {isPdf && (
                <div className="w-full h-[65vh] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-inner">
                  <iframe
                    src={objectUrl}
                    title={filename}
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {!isImage && !isPdf && (
                <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 max-w-md bg-white rounded-xl border border-gray-200 shadow-xs text-center">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                    {renderIcon()}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 break-all">{filename}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('activities.fileReadyForDownload', 'Soubor je připraven ke stažení.')}
                      {fileSize !== null && ` (${formatSize(fileSize)})`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {t('activities.downloadFile', 'Stáhnout soubor')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-white">
          <div className="text-xs text-gray-500">
            {!loading && !error && fileSize !== null && (
              <span>{formatSize(fileSize)}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              {t('common.close', 'Zavřít')}
            </button>
            {objectUrl && !loading && !error && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {t('activities.download', 'Stáhnout')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
