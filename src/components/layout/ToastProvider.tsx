import React from 'react';
import { useAppStore } from '../../store/store';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

const ToastProvider: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "pointer-events-auto flex items-center p-4 rounded-lg shadow-xl border transform transition-all duration-300 ease-in-out min-w-[300px]",
            toast.type === 'success' ? "bg-emerald-950 border-emerald-800 text-emerald-100" :
            toast.type === 'error' ? "bg-red-950 border-red-800 text-red-100" :
            "bg-blue-950 border-blue-800 text-blue-100"
          )}
        >
          <div className="mr-3 flex-shrink-0">
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
          </div>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button 
            onClick={() => removeToast(toast.id)}
            className="ml-4 p-1 rounded hover:bg-black/20 focus:outline-none transition-colors"
          >
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;
