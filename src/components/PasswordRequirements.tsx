'use client';

import { PASSWORD_RULES } from '@/helper/passwordSchema';

export default function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${passed ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0">
              {passed ? <path d="M20 6 9 17l-5-5" /> : <path d="M6 6l12 12M18 6 6 18" />}
            </svg>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
