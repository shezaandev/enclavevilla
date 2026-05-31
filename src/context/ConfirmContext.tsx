import React, { createContext, useContext, useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface ConfirmOptions {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
  confirmText: string;
  cancelText?: string;
  onConfirmAction?: () => Promise<void> | void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveFn, setResolveFn] = useState<((val: boolean) => void) | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setIsConfirming(false);
      setResolveFn(() => resolve);
    });
  };

  const handleCancel = () => {
    if (isConfirming) return; // Prevent cancelling while loading
    setIsOpen(false);
    if (resolveFn) resolveFn(false);
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    // Add a brief delay to show loading state as requested, and optional callback logic
    if (options?.onConfirmAction) {
      try {
        await options.onConfirmAction();
      } catch (err) {
        console.error("Action handler failed", err);
      }
    } else {
      // Simulate/ensure a beautiful, tactile loading effect if no async handler is provided
      await new Promise((r) => setTimeout(r, 450));
    }
    setIsConfirming(false);
    setIsOpen(false);
    if (resolveFn) resolveFn(true);
  };

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isConfirming]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div 
          onClick={handleCancel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.80)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
          className="animate-fadeIn p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e1e1e',
              border: '0.5px solid #3a3a3a',
              borderRadius: '16px',
              padding: '2rem',
              width: '400px',
              maxWidth: '90vw',
            }}
            className="animate-slideUp shadow-2xl flex flex-col items-center"
          >
            {/* Icon */}
            <div 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                ...(options.type === 'danger' && {
                  background: '#3d1a1a',
                  border: '1px solid #7a2a2a',
                }),
                ...(options.type === 'warning' && {
                  background: '#3d2a00',
                  border: '1px solid #7a5500',
                }),
                ...(options.type === 'info' && {
                  background: '#1a2d3d',
                  border: '1px solid #1a5578',
                })
              }}
            >
              {options.type === 'danger' && <Trash2 size={24} color="#e24b4a" />}
              {options.type === 'warning' && <AlertTriangle size={24} color="#c9a84c" />}
              {options.type === 'info' && <Info size={24} color="#4a9eca" />}
            </div>

            {/* Title */}
            <h3 
              style={{
                fontSize: '17px',
                fontWeight: 500,
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '8px',
              }}
              className="font-serif"
            >
              {options.title}
            </h3>

            {/* Message */}
            <p 
              style={{
                fontSize: '14px',
                color: '#aaaaaa',
                textAlign: 'center',
                lineHeight: 1.6,
                marginBottom: options.details ? '6px' : '1.75rem',
              }}
              className="font-sans"
            >
              {options.message}
            </p>

            {/* Details (Muted, smaller) */}
            {options.details && (
              <p 
                style={{
                  fontSize: '12px',
                  color: '#666666',
                  textAlign: 'center',
                  marginBottom: '1.75rem',
                }}
                className="font-sans"
              >
                {options.details}
              </p>
            )}

            {/* Buttons Row */}
            <div 
              style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
              }}
            >
              {/* Cancel Button */}
              <button 
                type="button"
                disabled={isConfirming}
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: 'transparent',
                  border: '0.5px solid #444',
                  borderRadius: '10px',
                  color: '#cccccc',
                  fontSize: '14px',
                  cursor: isConfirming ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                className="hover:bg-[#2a2a2a] hover:border-[#666] font-sans font-medium text-center"
              >
                {options.cancelText || 'Cancel'}
              </button>

              {/* Confirm Button */}
              <button 
                type="button"
                disabled={isConfirming}
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '11px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isConfirming ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  ...(options.type === 'danger' && {
                    background: '#dc2626',
                    color: '#ffffff',
                  }),
                  ...(options.type === 'warning' && {
                    background: '#c9a84c',
                    color: '#1a1a1a',
                  }),
                  ...(options.type === 'info' && {
                    background: '#2563eb',
                    color: '#ffffff',
                  })
                }}
                className={`font-sans ${
                  options.type === 'danger' ? 'hover:bg-[#b91c1c]' :
                  options.type === 'warning' ? 'hover:bg-[#b8962a]' : 'hover:bg-[#1d4ed8]'
                }`}
              >
                {isConfirming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  options.confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
