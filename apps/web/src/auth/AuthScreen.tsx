import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ApiError } from "../lib/api";
import { useAuthStore } from "../state/useAuthStore";
import { useThemeStore } from "../state/useThemeStore";
import {
  getConfirmPasswordMessage,
  validateLogin,
  validateRegister,
  type FieldErrors,
  type LoginValues,
  type RegisterValues
} from "./validation";

const initialLogin: LoginValues = {
  email: "",
  password: ""
};

const initialRegister: RegisterValues = {
  firstName: "",
  lastName: "",
  birthDate: "",
  email: "",
  password: "",
  confirmPassword: ""
};

type Mode = "login" | "register";

export function AuthScreen() {
  const theme = useThemeStore((state) => state.theme);
  const logoSrc =
    theme === "dark"
      ? "/assets/logo/balaio-logo-horizontal-dark.svg"
      : "/assets/logo/balaio-logo-horizontal.svg";
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [mode, setMode] = useState<Mode>("login");
  const [loginValues, setLoginValues] = useState(initialLogin);
  const [registerValues, setRegisterValues] = useState(initialRegister);
  const [loginErrors, setLoginErrors] = useState<FieldErrors<LoginValues>>({});
  const [registerErrors, setRegisterErrors] = useState<FieldErrors<RegisterValues>>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirmMessage = useMemo(
    () => getConfirmPasswordMessage(registerValues.password, registerValues.confirmPassword),
    [registerValues.password, registerValues.confirmPassword]
  );

  const handleApiError = (
    error: unknown,
    setErrors: (errors: Record<string, string>) => void
  ) => {
    if (error instanceof ApiError) {
      setErrors(error.fields ?? { form: error.message });
      return;
    }

    setErrors({ form: "Nao foi possivel concluir agora." });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLogin(loginValues);
    setLoginErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await login(loginValues);
    } catch (error) {
      handleApiError(error, setLoginErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateRegister(registerValues);
    setRegisterErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await register(registerValues);
    } catch (error) {
      handleApiError(error, setRegisterErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Autenticacao">
        <img className="auth-logo" src={logoSrc} alt="Balaio" />

        <div className="auth-tabs" role="tablist" aria-label="Entrar ou criar conta">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Criar conta
          </button>
        </div>

        {mode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <Field
              label="Email"
              name="login-email"
              type="email"
              value={loginValues.email}
              error={loginErrors.email}
              onChange={(value) => setLoginValues((current) => ({ ...current, email: value }))}
            />
            <PasswordField
              label="Senha"
              name="login-password"
              value={loginValues.password}
              visible={showLoginPassword}
              error={loginErrors.password}
              onToggle={() => setShowLoginPassword((visible) => !visible)}
              onChange={(value) => setLoginValues((current) => ({ ...current, password: value }))}
            />
            <FormMessage message={loginErrors.form} tone="error" />
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle size={17} className="spin" /> : null}
              Entrar
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <div className="auth-grid">
              <Field
                label="Nome"
                name="first-name"
                value={registerValues.firstName}
                error={registerErrors.firstName}
                onChange={(value) => setRegisterValues((current) => ({ ...current, firstName: value }))}
              />
              <Field
                label="Sobrenome"
                name="last-name"
                value={registerValues.lastName}
                error={registerErrors.lastName}
                onChange={(value) => setRegisterValues((current) => ({ ...current, lastName: value }))}
              />
            </div>
            <Field
              label="Data de nascimento"
              name="birth-date"
              type="date"
              value={registerValues.birthDate}
              error={registerErrors.birthDate}
              onChange={(value) => setRegisterValues((current) => ({ ...current, birthDate: value }))}
            />
            <Field
              label="Email"
              name="register-email"
              type="email"
              value={registerValues.email}
              error={registerErrors.email}
              onChange={(value) => setRegisterValues((current) => ({ ...current, email: value }))}
            />
            <PasswordField
              label="Senha"
              name="register-password"
              value={registerValues.password}
              visible={showRegisterPassword}
              error={registerErrors.password}
              onToggle={() => setShowRegisterPassword((visible) => !visible)}
              onChange={(value) => setRegisterValues((current) => ({ ...current, password: value }))}
            />
            <PasswordField
              label="Confirmar senha"
              name="confirm-password"
              value={registerValues.confirmPassword}
              visible={showConfirmPassword}
              error={registerErrors.confirmPassword}
              message={registerValues.confirmPassword ? confirmMessage.message : undefined}
              messageTone={confirmMessage.type}
              onToggle={() => setShowConfirmPassword((visible) => !visible)}
              onChange={(value) => setRegisterValues((current) => ({ ...current, confirmPassword: value }))}
            />
            <FormMessage message={registerErrors.form} tone="error" />
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle size={17} className="spin" /> : null}
              Criar conta
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

function Field({ label, name, type = "text", value, error, onChange }: FieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${name}-message` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <FormMessage id={`${name}-message`} message={error} tone="error" />
    </div>
  );
}

type PasswordFieldProps = FieldProps & {
  visible: boolean;
  message?: string;
  messageTone?: "success" | "error";
  onToggle: () => void;
};

function PasswordField({
  label,
  name,
  value,
  visible,
  error,
  message,
  messageTone = "error",
  onToggle,
  onChange
}: PasswordFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <span className="password-wrap">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error || message ? `${name}-message` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={onToggle}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      <FormMessage id={`${name}-message`} message={error ?? message} tone={error ? "error" : messageTone} />
    </div>
  );
}

type FormMessageProps = {
  id?: string;
  message?: string;
  tone: "success" | "error";
};

function FormMessage({ id, message, tone }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <small id={id} className={`auth-message ${tone}`}>
      {message}
    </small>
  );
}
