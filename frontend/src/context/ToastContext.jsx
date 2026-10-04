import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  emergency: AlertTriangle,
  success: CheckCircle2,
  info: Info,
  notification: Bell,
};

const COLORS = {
  emergency: 'border-red-500 bg-red-50',
  success: 'border-green-500 bg-green-50',
  info: 'border-blue-500 bg-blue-50',
  notification: 'border-primary-500 bg-primary-50',
};

const ICON_COLORS = {
  emergency: 'text-red-600',
  success: 'text-green-600',
  info: 'text-blue-600',
  notification: 'text-primary-600',
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(({ title, body, type = 'notification', duration = 6000, link }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, title, body, type, link }]);

    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container — fixed at top right */}
      <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '400px' }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const navigate = useNavigate();
  const Icon = ICONS[toast.type] || Bell;
  const colorClass = COLORS[toast.type] || COLORS.notification;
  const iconColor = ICON_COLORS[toast.type] || ICON_COLORS.notification;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 p-4 shadow-lg backdrop-blur-sm animate-slide-in-right ${colorClass}`}
      role="alert"
      style={{
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{toast.title}</p>
        {toast.body && <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{toast.body}</p>}
        {toast.link && (
          <button
            onClick={() => { navigate(toast.link); onClose(); }}
            className="mt-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            View Details →
          </button>
        )}
      </div>
      <button onClick={onClose} className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
