import * as yup from "yup";

export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

// Standard industry password policy: min length, upper/lower case, number, special char.
export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter (a-z)", test: (v) => /[a-z]/.test(v) },
  { label: "One number (0-9)", test: (v) => /[0-9]/.test(v) },
  { label: "One special character (!@#$%^&*)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordSchema(requiredMessage: string) {
  return yup
    .string()
    .required(requiredMessage)
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must be at most 64 characters")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/, "Password must contain at least one special character");
}
