"use client";

import React from "react";
import { Icon } from "@iconify/react";

const inputClass =
  "w-full py-3 px-3.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white outline-none transition-all duration-200 placeholder-gray-400 focus:border-violet-500 focus:ring-3 focus:ring-violet-500/10 disabled:bg-gray-50 disabled:text-gray-400";

const withIconClass = "pl-10";

function IconPrefix({ icon }: { icon: string }) {
  return (
    <Icon
      icon={icon}
      width={18}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Input({ icon, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: string }) {
  if (!icon) return <input {...props} className={`${inputClass} ${className ?? ""}`} />;
  return (
    <div className="relative flex items-center">
      <IconPrefix icon={icon} />
      <input {...props} className={`${inputClass} ${withIconClass} ${className ?? ""}`} />
    </div>
  );
}

export function TextArea({
  icon,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { icon?: string }) {
  if (!icon) return <textarea {...props} className={`${inputClass} resize-none ${className ?? ""}`} />;
  return (
    <div className="relative">
      <Icon icon={icon} width={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
      <textarea {...props} className={`${inputClass} ${withIconClass} resize-none ${className ?? ""}`} />
    </div>
  );
}

export function Select({
  options,
  placeholder,
  icon,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  placeholder?: string;
  icon?: string;
}) {
  const select = (
    <select
      {...props}
      className={`${inputClass} appearance-none pr-9 ${icon ? withIconClass : ""} ${className ?? ""}`}
    >
      <option value="">{placeholder ?? "Select..."}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="relative flex items-center">
      {icon && <IconPrefix icon={icon} />}
      {select}
      <Icon
        icon="solar:alt-arrow-down-bold"
        width={14}
        className="absolute right-3.5 text-gray-400 pointer-events-none"
      />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 border border-gray-300 rounded text-violet-600 focus:ring-violet-500"
      />
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  );
}

export function ImageDropInput({
  onFile,
  previewLabel,
  fileName,
}: {
  onFile: (file: File) => void;
  previewLabel: string;
  fileName?: string;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 px-4 cursor-pointer hover:border-violet-400 transition-colors">
      <Icon icon="solar:camera-bold" width={22} className="text-gray-300" />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <span className="text-sm text-gray-500">{fileName ? `Selected: ${fileName}` : previewLabel}</span>
    </label>
  );
}

// Matches the numbered-badge-and-divider section header used at the top of
// every step card ("① Business Information ————————").
export function SectionHeader({ number, title }: { number?: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {number !== undefined && (
        <span className="shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
      )}
      <span className="shrink-0 text-base font-semibold text-gray-900">{title}</span>
      <span className="flex-1 border-t border-gray-200" />
    </div>
  );
}

export function StepFooter({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextIcon = "solar:arrow-right-bold",
  loading = false,
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextIcon?: string;
  loading?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 mt-8">
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className="w-full py-3.5 bg-violet-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:bg-violet-700 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          "Please wait..."
        ) : (
          <>
            {nextLabel}
            <Icon icon={nextIcon} width={16} />
          </>
        )}
      </button>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}
