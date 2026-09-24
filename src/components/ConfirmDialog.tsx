import React, { useState } from 'react';
import { Language } from '../types';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  language?: Language;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replaces window.confirm: big buttons, both languages, no tiny browser text.
 * Red is reserved for destructive actions only.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  body,
  confirmLabel,
  language = 'EN',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  const lu = language === 'LU';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6" onClick={onCancel}>
      <div
        className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 text-center space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`material-symbols-outlined text-[40px] ${danger ? 'text-status-bad-tx' : 'text-primary'}`}>
          {danger ? 'warning' : 'help'}
        </span>
        <h2 className="font-bold text-primary">{title}</h2>
        <p className="text-xs text-text-muted leading-relaxed">{body}</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full min-h-[52px] rounded-lg font-bold text-sm active:scale-[0.99] ${
              danger ? 'bg-status-bad-tx text-white' : 'bg-[#00261b] text-white'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] rounded-lg font-bold text-sm bg-surface-container text-primary active:scale-[0.99]"
          >
            {lu ? 'Nedda, ddayo' : 'No, go back'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  confirmLabel: string;
  language?: Language;
  onSubmit: (value: string | null) => void;
}

/**
 * Replaces window.prompt: same null-on-cancel contract, readable input.
 */
export const PromptDialog: React.FC<PromptDialogProps> = ({
  isOpen,
  title,
  placeholder,
  confirmLabel,
  language = 'EN',
  onSubmit,
}) => {
  const [value, setValue] = useState('');
  if (!isOpen) return null;
  const lu = language === 'LU';
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6"
      onClick={() => {
        setValue('');
        onSubmit(null);
      }}
    >
      <div
        className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 text-center space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-primary text-sm">{title}</h2>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[52px] border-2 border-border-strong rounded-xl px-4 text-sm bg-white"
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              const v = value;
              setValue('');
              onSubmit(v);
            }}
            className="w-full min-h-[52px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setValue('');
              onSubmit(null);
            }}
            className="w-full min-h-[48px] rounded-lg font-bold text-sm bg-surface-container text-primary active:scale-[0.99]"
          >
            {lu ? 'Sazaamu' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
