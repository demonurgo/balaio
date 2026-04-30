import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Edit3,
  LayoutList,
  Moon,
  MoreHorizontal,
  Plus,
  Settings,
  Share2,
  ShoppingBasket,
  Sun,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useFairStore } from "./state/useFairStore";
import { useThemeStore } from "./state/useThemeStore";

const emptyFair = {
  id: "empty",
  label: "Sem feira",
  budget: 1,
  total: 0,
  memberCount: 0
};

function App() {
  const fairs = useFairStore((state) => state.fairs);
  const selectedFairId = useFairStore((state) => state.selectedFairId);
  const selectFair = useFairStore((state) => state.selectFair);
  const items = useFairStore((state) => state.itemsByFair[selectedFairId] ?? []);
  const togglePurchased = useFairStore((state) => state.togglePurchased);
  const selectedFair = fairs.find((fair) => fair.id === selectedFairId) ?? fairs[0] ?? emptyFair;
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const logoSrc =
    theme === "dark"
      ? "/assets/logo/balaio-logo-horizontal-dark.svg"
      : "/assets/logo/balaio-logo-horizontal.svg";

  const totals = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const remaining = selectedFair.budget - total;
    const percent = Math.min(Math.round((total / selectedFair.budget) * 100), 999);

    return { total, remaining, percent };
  }, [items, selectedFair.budget]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logoSrc} alt="Balaio" />
        </div>

        <nav className="nav-list" aria-label="Principal">
          <a className="nav-item active" href="#feiras">
            <ShoppingBasket size={19} />
            Feiras
          </a>
          <a className="nav-item" href="#calendario">
            <CalendarDays size={19} />
            Calendario
          </a>
          <a className="nav-item" href="#orcamento">
            <Wallet size={19} />
            Orcamento
          </a>
          <a className="nav-item" href="#perfil">
            <UserRound size={19} />
            Perfil
          </a>
        </nav>

        <button className="nav-item settings" type="button">
          <Settings size={19} />
          Configuracoes
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="mobile-brand">
            <img src={logoSrc} alt="Balaio" />
          </div>
          <div className="collaborators" aria-label="Pessoas online">
            <span className="avatar">MA</span>
            <span className="avatar">JR</span>
            <span className="live-dot" />
          </div>
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={toggleTheme}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="primary-button add-fair-button" type="button">
            <Plus size={17} />
            <span>Nova feira</span>
          </button>
        </header>

        <div className="workspace">
          <section className="month-panel" id="feiras">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mes</p>
                <h1>Minhas feiras</h1>
              </div>
              <button className="icon-button" type="button" aria-label="Mais opcoes">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="fair-list">
              {fairs.map((fair) => {
                const isActive = fair.id === selectedFairId;
                const progress = Math.min(Math.round((fair.total / fair.budget) * 100), 100);

                return (
                  <button
                    className={isActive ? "fair-row active" : "fair-row"}
                    key={fair.id}
                    type="button"
                    onClick={() => selectFair(fair.id)}
                  >
                    <span>
                      <strong>{fair.label}</strong>
                      <small>{fair.memberCount} pessoas</small>
                    </span>
                    <span className="money-block">
                      <small>Total</small>
                      <strong>{formatCurrency(fair.total)}</strong>
                    </span>
                    <ChevronRight className="fair-row-arrow" size={24} aria-hidden="true" />
                    <span className="progress-track" aria-hidden="true">
                      <span style={{ width: `${progress}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="fair-panel">
            <div className="fair-header">
              <button className="icon-button" type="button" aria-label="Voltar">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2>{selectedFair.label}</h2>
                <p>{selectedFair.memberCount} pessoas</p>
              </div>
              <div className="header-actions">
                <button className="ghost-button" type="button">
                  <Share2 size={17} />
                  Compartilhar
                </button>
                <button className="icon-button" type="button" aria-label="Editar">
                  <Edit3 size={18} />
                </button>
                <button className="primary-button" type="button">
                  <Plus size={17} />
                  Adicionar item
                </button>
              </div>
            </div>

            <div className="items-table" role="table" aria-label="Itens da feira">
              <div className="table-head" role="row">
                <span>Item</span>
                <span>Qtd.</span>
                <span>Preco</span>
                <span>Total</span>
                <span>Status</span>
              </div>

              {items.map((item) => (
                <div className={item.purchased ? "item-row purchased" : "item-row"} key={item.id} role="row">
                  <span className="item-name">
                    <LayoutList size={16} />
                    {item.name}
                  </span>
                  <span>{item.quantity}</span>
                  <span>{formatCurrency(item.unitPrice)}</span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                  <span className="row-actions">
                    <button className="icon-button compact" type="button" aria-label={`Editar ${item.name}`}>
                      <Edit3 size={16} />
                    </button>
                    <button className="icon-button compact" type="button" aria-label={`Excluir ${item.name}`}>
                      <Trash2 size={16} />
                    </button>
                    <button
                      className={item.purchased ? "status-button done" : "status-button"}
                      type="button"
                      aria-label={item.purchased ? `${item.name} comprado` : `Marcar ${item.name} como comprado`}
                      onClick={() => togglePurchased(item.id)}
                    >
                      {item.purchased ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-grid">
              <Metric label="Orcamento" value={formatCurrency(selectedFair.budget)} icon={<Wallet size={18} />} />
              <Metric label="Total" value={formatCurrency(totals.total)} icon={<LayoutList size={18} />} />
              <Metric
                label="Restante"
                value={formatCurrency(totals.remaining)}
                icon={<Check size={18} />}
                tone={totals.remaining < 0 ? "danger" : "success"}
              />
              <div className="budget-ring">
                <strong>{totals.percent}%</strong>
                <span>do orcamento</span>
              </div>
            </div>

            <footer className="realtime-bar">
              <div>
                <CheckCircle2 size={18} />
                Salvo ha alguns segundos
              </div>
              <div className="presence">
                <span><i className="online" />Online</span>
                <span><i className="editing" />Editando</span>
                <span><i className="viewing" />Visualizando</span>
              </div>
            </footer>
          </section>
        </div>
      </section>

      <nav className="bottom-tabs" aria-label="Navegacao principal">
        <a className="bottom-tab active" href="#feiras">
          <ShoppingBasket size={22} />
          <span>Feiras</span>
        </a>
        <a className="bottom-tab" href="#calendario">
          <CalendarDays size={22} />
          <span>Calendario</span>
        </a>
        <a className="bottom-tab" href="#orcamento">
          <Wallet size={22} />
          <span>Orcamento</span>
        </a>
        <a className="bottom-tab" href="#perfil">
          <UserRound size={22} />
          <span>Perfil</span>
        </a>
      </nav>
    </main>
  );
}

type MetricProps = {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "success" | "danger";
};

function Metric({ label, value, icon, tone }: MetricProps) {
  return (
    <div className={tone ? `metric ${tone}` : "metric"}>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export default App;
