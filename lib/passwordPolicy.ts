/**
 * Password complexity validator according to SchoolOS security policy.
 * Returns an array of error strings detailing missing requirements.
 * Returns an empty array if the password meets all complexity requirements.
 */
export function validatePasswordComplexity(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("At least one special character");
  }

  return errors;
}
