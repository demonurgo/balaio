import { LoaderCircle, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";
import { acceptInvite, getInvite, type InvitePreviewDto } from "../fair/fairApi";
import { triggerHaptic } from "../lib/haptics";
import { leaveInvitePath } from "./invitePath";

type InviteState =
  | { status: "loading" }
  | { status: "ready"; invite: InvitePreviewDto }
  | { status: "error"; message: string };

function useInvitePreview(code: string) {
  const [state, setState] = useState<InviteState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    getInvite(code)
      .then((response) => active && setState({ status: "ready", invite: response.data }))
      .catch((error: unknown) =>
        active && setState({ status: "error", message: error instanceof Error ? error.message : "Convite indisponível." })
      );

    return () => {
      active = false;
    };
  }, [code]);

  return state;
}

/** Shown above the login form when someone opens an invite without being logged in. */
export function InviteNotice({ code }: { code: string }) {
  const state = useInvitePreview(code);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "error") {
    return <p className="invite-notice error">{state.message}</p>;
  }

  return (
    <p className="invite-notice">
      <strong>{state.invite.owner.firstName}</strong> convidou você para a feira <strong>{state.invite.fair.name}</strong>. Entre ou crie
      sua conta para participar.
    </p>
  );
}

type InvitePageProps = {
  code: string;
  onJoined: (fairId: string) => Promise<void> | void;
};

export function InvitePage({ code, onJoined }: InvitePageProps) {
  const state = useInvitePreview(code);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const join = async () => {
    triggerHaptic("medium");
    setJoining(true);
    setError("");

    try {
      const response = await acceptInvite(code);
      triggerHaptic("success");
      await onJoined(response.data.fairId);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Não foi possível entrar na feira.");
      triggerHaptic("warning");
      setJoining(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel invite-panel" aria-label="Convite para feira">
        <span className="invite-icon">
          <ShoppingBasket size={26} />
        </span>
        {state.status === "loading" ? <LoaderCircle className="spin" size={22} /> : null}
        {state.status === "error" ? (
          <>
            <h1>Convite indisponível</h1>
            <p className="invite-text">{state.message}</p>
            <button className="auth-submit" type="button" onClick={() => leaveInvitePath()}>
              Ir para minhas feiras
            </button>
          </>
        ) : null}
        {state.status === "ready" ? (
          <>
            <h1>{state.invite.fair.name}</h1>
            <p className="invite-text">
              {state.invite.alreadyMember
                ? "Você já participa desta feira."
                : `${state.invite.owner.firstName} convidou você para montar esta feira junto. ${state.invite.fair.memberCount} ${
                    state.invite.fair.memberCount === 1 ? "pessoa participa" : "pessoas participam"
                  } agora.`}
            </p>
            {error ? <p className="auth-message error">{error}</p> : null}
            {state.invite.alreadyMember ? (
              <button className="auth-submit" type="button" onClick={() => void onJoined(state.invite.fair.id)}>
                Abrir feira
              </button>
            ) : (
              <button className="auth-submit" type="button" disabled={joining} onClick={() => void join()}>
                {joining ? <LoaderCircle className="spin" size={17} /> : null}
                Participar da feira
              </button>
            )}
            <button className="invite-dismiss" type="button" onClick={() => leaveInvitePath()}>
              Agora não
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}
