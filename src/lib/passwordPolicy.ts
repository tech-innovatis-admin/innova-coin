export const PASSWORD_MIN_LENGTH = 8;

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;

export type PasswordPolicyStatus = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialCharacter: boolean;
};

export type PasswordChangeFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function getPasswordPolicyStatus(password: string): PasswordPolicyStatus {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: UPPERCASE_PATTERN.test(password),
    lowercase: LOWERCASE_PATTERN.test(password),
    number: NUMBER_PATTERN.test(password),
    specialCharacter: SPECIAL_CHARACTER_PATTERN.test(password),
  };
}

export function getPasswordPolicyErrors(password: string) {
  const status = getPasswordPolicyStatus(password);
  const errors: string[] = [];

  if (!status.minLength) {
    errors.push(`A nova senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }

  if (!status.uppercase) {
    errors.push("A nova senha deve conter ao menos uma letra maiuscula.");
  }

  if (!status.lowercase) {
    errors.push("A nova senha deve conter ao menos uma letra minuscula.");
  }

  if (!status.number) {
    errors.push("A nova senha deve conter ao menos um numero.");
  }

  if (!status.specialCharacter) {
    errors.push("A nova senha deve conter ao menos um caractere especial.");
  }

  return errors;
}

export function validatePasswordChangeFields(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const fieldErrors: PasswordChangeFieldErrors = {};
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (!currentPassword) {
    fieldErrors.currentPassword = "Informe a senha atual.";
  }

  if (!newPassword) {
    fieldErrors.newPassword = "Informe a nova senha.";
  } else if (currentPassword && currentPassword === newPassword) {
    fieldErrors.newPassword = "A nova senha deve ser diferente da senha atual.";
  } else {
    const passwordErrors = getPasswordPolicyErrors(newPassword);

    if (passwordErrors.length > 0) {
      fieldErrors.newPassword = passwordErrors[0];
    }
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Confirme a nova senha.";
  } else if (newPassword !== confirmPassword) {
    fieldErrors.confirmPassword = "A confirmacao da senha nao confere.";
  }

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}
