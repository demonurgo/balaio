import { ArrowLeft, Check, Copy, LoaderCircle, LogOut, Share2, UserMinus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { triggerHaptic } from "../lib/haptics";
import type { Fair } from "../state/useFairStore";
import { createInvite, getMembers, removeMember, type FairInviteDto, type FairMemberDto } from "./fairApi";

type FairMembersPageProps = {
  fair: Fair;
  onBack: () => void;
  /** Called after the current person leaves the fair. */
  onLeft: () => void;
  onMembersChanged: () => void;
};

const roleLabels: Record<FairMemberDto["role"], string> = {
  owner: "Dono da feira",
  editor: "Pode editar",
  viewer: "Só pode ver"
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Algo deu errado. Tente de novo.";
}

function getMemberInitials(member: FairMemberDto) {
  const first = member.firstName || member.name;
  return `${first.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase() || "?";
}

function formatInviteExpiry(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(value));
}

export function FairMembersPage({ fair, onBack, onLeft, onMembersChanged }: FairMembersPageProps) {
  const [members, setMembers] = useState<FairMemberDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<FairInviteDto | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const me = members.find((member) => member.isMe);
  const isOwner = me?.isOwner ?? false;

  useEffect(() => {
    let active = true;

    getMembers(fair.id)
      .then((response) => {
        if (active) {
          setMembers(response.data);
          setStatus("ready");
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setStatus("error");
          setError(getErrorMessage(loadError));
        }
      });

    return () => {
      active = false;
    };
  }, [fair.id, fair.memberCount]);

  const handleInvite = async () => {
    triggerHaptic("medium");
    setInviteLoading(true);
    setError("");

    try {
      const response = await createInvite(fair.id);
      setInvite(response.data);
      triggerHaptic("success");
    } catch (inviteError) {
      setError(getErrorMessage(inviteError));
      triggerHaptic("warning");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!invite) {
      return;
    }

    triggerHaptic("selection");
    await navigator.clipboard?.writeText(invite.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const shareInvite = async () => {
    if (!invite) {
      return;
    }

    triggerHaptic("selection");

    try {
      await navigator.share({
        title: `Feira ${fair.label}`,
        text: `Entre na feira ${fair.label} no Balaio:`,
        url: invite.url
      });
    } catch {
      // Dismissing the share sheet is not an error.
    }
  };

  const handleRemove = async (member: FairMemberDto) => {
    const leaving = member.isMe;
    const question = leaving
      ? `Sair da feira ${fair.label}? Você só volta com um novo convite.`
      : `Remover ${member.name} da feira ${fair.label}?`;

    if (!window.confirm(question)) {
      triggerHaptic("warning");
      return;
    }

    setBusyUserId(member.userId);
    setError("");

    try {
      await removeMember(fair.id, member.userId);
      triggerHaptic("success");

      if (leaving) {
        onLeft();
        return;
      }

      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      onMembersChanged();
    } catch (removeError) {
      setError(getErrorMessage(removeError));
      triggerHaptic("warning");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <section className="fair-screen members-page" aria-label={`Pessoas da feira ${fair.label}`}>
      <header className="fair-screen-header">
        <button className="icon-button screen-back-button" type="button" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1>Compartilhar</h1>
          <p>{fair.label}</p>
        </div>
      </header>

      {isOwner ? (
        <section className="profile-section" aria-label="Convite">
          <h2>Convite</h2>
          <div className="invite-card">
            <p>Quem abrir o link e entrar na conta passa a editar esta feira com você, em tempo real.</p>
            {invite ? (
              <>
                <div className="invite-link">
                  <span>{invite.url}</span>
                </div>
                <small>Vale até {formatInviteExpiry(invite.expiresAt)}.</small>
                <div className="invite-actions">
                  <button className="ghost-button" type="button" onClick={() => void copyInvite()}>
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                    {copied ? "Copiado" : "Copiar link"}
                  </button>
                  {typeof navigator.share === "function" ? (
                    <button className="primary-button" type="button" onClick={() => void shareInvite()}>
                      <Share2 size={17} />
                      Enviar
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <button className="primary-button" type="button" disabled={inviteLoading} onClick={() => void handleInvite()}>
                {inviteLoading ? <LoaderCircle className="spin" size={17} /> : <Share2 size={17} />}
                Criar link de convite
              </button>
            )}
          </div>
        </section>
      ) : null}

      <section className="profile-section" aria-label="Pessoas">
        <h2>Pessoas</h2>
        {status === "loading" ? <p className="members-status">Carregando…</p> : null}
        {error ? <p className="members-status error">{error}</p> : null}
        {status === "ready" ? (
          <div className="profile-list">
            {members.map((member) => (
              <div className="profile-row member-row" key={member.userId}>
                <span className="profile-row-icon member-avatar">
                  {member.imageUrl ? <img src={member.imageUrl} alt="" /> : getMemberInitials(member) || <UserRound size={18} />}
                </span>
                <span>
                  <small>{roleLabels[member.role]}</small>
                  <strong>
                    {member.name}
                    {member.isMe ? " (você)" : ""}
                  </strong>
                </span>
                {isOwner && !member.isOwner ? (
                  <button
                    className="icon-button compact"
                    type="button"
                    aria-label={`Remover ${member.name}`}
                    disabled={busyUserId === member.userId}
                    onClick={() => void handleRemove(member)}
                  >
                    <UserMinus size={17} />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {me && !me.isOwner ? (
        <button className="profile-logout" type="button" disabled={busyUserId === me.userId} onClick={() => void handleRemove(me)}>
          <LogOut size={18} />
          Sair da feira
        </button>
      ) : null}
    </section>
  );
}
