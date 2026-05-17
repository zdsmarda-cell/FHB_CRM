import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText
}: AlertModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 pr-6">{title}</h2>
          </div>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {buttonText || t('common.close', 'Zavřít')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
