export type RegisterValues = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginValues = {
  email: string;
  password: string;
};

export type FieldErrors<T extends Record<string, unknown>> = Partial<Record<keyof T | "form", string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: LoginValues): FieldErrors<LoginValues> {
  const errors: FieldErrors<LoginValues> = {};

  if (!values.email.trim()) {
    errors.email = "Email obrigatorio.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Email invalido.";
  }

  if (!values.password) {
    errors.password = "Senha obrigatoria.";
  }

  return errors;
}

export function validateRegister(values: RegisterValues): FieldErrors<RegisterValues> {
  const errors: FieldErrors<RegisterValues> = {};

  if (!values.firstName.trim()) {
    errors.firstName = "Nome obrigatorio.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Sobrenome obrigatorio.";
  }

  if (!values.birthDate) {
    errors.birthDate = "Data de nascimento obrigatoria.";
  } else {
    const [year, month, day] = values.birthDate.split("-").map(Number);
    const birthDate = new Date(`${values.birthDate}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate.getUTCFullYear() !== year ||
      birthDate.getUTCMonth() + 1 !== month ||
      birthDate.getUTCDate() !== day ||
      birthDate > today
    ) {
      errors.birthDate = "Data de nascimento invalida.";
    }
  }

  if (!values.email.trim()) {
    errors.email = "Email obrigatorio.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Email invalido.";
  }

  if (!values.password) {
    errors.password = "Senha obrigatoria.";
  } else if (values.password.length < 8) {
    errors.password = "Senha deve ter no minimo 8 caracteres.";
  } else if (values.password.length > 128) {
    errors.password = "Senha deve ter no maximo 128 caracteres.";
  }

  const confirmMessage = getConfirmPasswordMessage(values.password, values.confirmPassword);

  if (confirmMessage?.type === "error") {
    errors.confirmPassword = confirmMessage.message;
  }

  return errors;
}

export function getConfirmPasswordMessage(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return {
      type: "error" as const,
      message: "Confirme a senha."
    };
  }

  if (password !== confirmPassword) {
    return {
      type: "error" as const,
      message: "As senhas precisam ser iguais."
    };
  }

  return {
    type: "success" as const,
    message: "Senhas iguais."
  };
}
