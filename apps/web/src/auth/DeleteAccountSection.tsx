import { LoaderCircle, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { ApiError } from "../lib/api";
import { triggerHaptic } from "../lib/haptics";
import { useAuthStore } from "../state/useAuthStore";

export function DeleteAccountSection() {
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password) {
      setError("Digite sua senha para confirmar.");
      return;
    }

    if (!window.confirm("Excluir sua conta de vez? Isso não pode ser desfeito.")) {
      triggerHaptic("warning");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await deleteAccount(password);
      triggerHaptic("success");
    } catch (deleteError) {
      setError(
        deleteError instanceof ApiError
          ? deleteError.fields?.password ?? deleteError.message
          : "Não foi possível excluir a conta."
      );
      triggerHaptic("warning");
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        className="profile-delete-account"
        type="button"
        onClick={() => {
          triggerHaptic("light");
          setOpen(true);
        }}
      >
        <Trash2 size={16} />
        Excluir conta
      </button>
    );
  }

  return (
    <form className="delete-account-card" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <h2>Excluir conta</h2>
      <p>Isto apaga sua conta, sua foto e seu estoque.</p>
      <ul>
        <li>As feiras que você criou somem para todas as pessoas que participam delas.</li>
        <li>Nas feiras de outras pessoas, você só deixa de participar.</li>
      </ul>
      <label className="auth-field">
        <span>Senha</span>
        <input
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="auth-message error">{error}</p> : null}
      <div className="delete-account-actions">
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError("");
          }}
        >
          Cancelar
        </button>
        <button className="danger-button" type="submit" disabled={submitting}>
          {submitting ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
          Excluir de vez
        </button>
      </div>
    </form>
  );
}
