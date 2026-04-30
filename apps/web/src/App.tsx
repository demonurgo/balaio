import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Edit3,
  LayoutList,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Share2,
  ShoppingBasket,
  Sun,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthScreen } from "./auth/AuthScreen";
import { triggerHaptic, triggerHapticDuration } from "./lib/haptics";
import { playSound } from "./lib/sound";
import { useAuthStore } from "./state/useAuthStore";
import { useFairStore } from "./state/useFairStore";
import type { Fair, FairItem } from "./state/useFairStore";
import { useThemeStore } from "./state/useThemeStore";

const emptyFair = {
  id: "empty",
  label: "Sem feira",
  budget: 1,
  total: 0,
  memberCount: 0
};

function App() {
  const authStatus = useAuthStore((state) => state.status);
  const loadMe = useAuthStore((state) => state.loadMe);
  const logout = useAuthStore((state) => state.logout);
  const fairs = useFairStore((state) => state.fairs);
  const selectedFairId = useFairStore((state) => state.selectedFairId);
  const selectFair = useFairStore((state) => state.selectFair);
  const items = useFairStore((state) => state.itemsByFair[selectedFairId] ?? []);
  const togglePurchased = useFairStore((state) => state.togglePurchased);
  const selectedFair = fairs.find((fair) => fair.id === selectedFairId) ?? fairs[0] ?? emptyFair;
  const latestFairs = useMemo(() => fairs.slice(0, 3), [fairs]);
  const pendingItemsCount = useMemo(() => items.filter((item) => !item.purchased).length, [items]);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const logoSrc =
    theme === "dark"
      ? "/assets/logo/balaio-logo-horizontal-dark.svg"
      : "/assets/logo/balaio-logo-horizontal.svg";

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const totals = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const remaining = selectedFair.budget - total;
    const percent = Math.min(Math.round((total / selectedFair.budget) * 100), 999);

    return { total, remaining, percent };
  }, [items, selectedFair.budget]);

  const desktopBrandRef = useRef<HTMLImageElement>(null);
  const mobileBrandRef = useRef<HTMLImageElement>(null);

  const handleLogoClick = () => {
    triggerHapticDuration(590, 0.65);
    playSound("logo");
    const keyframes: Keyframe[] = [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(-3px) rotate(-2deg)", offset: 0.15 },
      { transform: "translateX(3px) rotate(2deg)", offset: 0.3 },
      { transform: "translateX(-3px) rotate(-2deg)", offset: 0.45 },
      { transform: "translateX(3px) rotate(2deg)", offset: 0.6 },
      { transform: "translateX(-2px) rotate(-1deg)", offset: 0.75 },
      { transform: "translateX(2px) rotate(1deg)", offset: 0.9 },
      { transform: "translateX(0) rotate(0deg)" }
    ];
    const opts: KeyframeAnimationOptions = { duration: 590, easing: "ease-in-out" };
    desktopBrandRef.current?.animate(keyframes, opts);
    mobileBrandRef.current?.animate(keyframes, opts);
  };

  if (authStatus === "loading") {
    return (
      <main className="auth-shell">
        <img className="auth-logo loading" src={logoSrc} alt="Balaio" />
      </main>
    );
  }

  if (authStatus === "anonymous") {
    return <AuthScreen />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button type="button" className="brand brand-button" onClick={handleLogoClick} aria-label="Balaio">
          <img ref={desktopBrandRef} src={logoSrc} alt="Balaio" />
        </button>

        <nav className="nav-list" aria-label="Principal">
          <a className="nav-item active" href="#feiras" onClick={() => triggerHaptic("selection")}>
            <ShoppingBasket size={19} />
            Feiras
          </a>
          <a className="nav-item" href="#calendario" onClick={() => triggerHaptic("selection")}>
            <CalendarDays size={19} />
            Calendario
          </a>
          <a className="nav-item" href="#orcamento" onClick={() => triggerHaptic("selection")}>
            <Wallet size={19} />
            Orcamento
          </a>
          <a className="nav-item" href="#perfil" onClick={() => triggerHaptic("selection")}>
            <UserRound size={19} />
            Perfil
          </a>
        </nav>

        <button
          className="nav-item settings"
          type="button"
          onClick={() => {
            triggerHaptic("light");
            void logout();
          }}
        >
          <LogOut size={19} />
          Sair
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <button type="button" className="mobile-brand brand-button" onClick={handleLogoClick} aria-label="Balaio">
            <img ref={mobileBrandRef} src={logoSrc} alt="Balaio" />
          </button>
          <div className="collaborators" aria-label="Pessoas online">
            <span className="avatar">MA</span>
            <span className="avatar">JR</span>
            <span className="live-dot" />
          </div>
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={() => {
              triggerHaptic("selection");
              toggleTheme();
            }}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="primary-button add-fair-button" type="button" onClick={() => triggerHaptic("medium")}>
            <Plus size={17} />
            <span>Nova feira</span>
          </button>
        </header>

        <div className="workspace">
          <section className="month-panel" id="feiras">
            <div className="section-heading">
              <div>
                <h1>Minhas feiras</h1>
              </div>
              <button className="icon-button" type="button" aria-label="Mais opcoes" onClick={() => triggerHaptic("light")}>
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="fair-list">
              {latestFairs.map((fair) => {
                const isActive = fair.id === selectedFairId;
                const progress = Math.min(Math.round((fair.total / fair.budget) * 100), 100);

                return (
                  <button
                    className={isActive ? "fair-row active" : "fair-row"}
                    key={fair.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      selectFair(fair.id);
                    }}
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

            <div className="quick-actions" aria-label="Acessos rapidos">
              <button
                className="quick-action"
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  selectFair(fairs[0]?.id ?? selectedFair.id);
                }}
              >
                <span className="quick-action-icon">
                  <ShoppingBasket size={18} />
                </span>
                <span className="quick-action-label">Feira atual</span>
              </button>
              <button className="quick-action" type="button" onClick={() => triggerHaptic("medium")}>
                <span className="quick-action-icon">
                  <Plus size={18} />
                </span>
                <span className="quick-action-label">Adicionar</span>
              </button>
              <button className="quick-action" type="button" onClick={() => triggerHaptic("selection")}>
                <span className="quick-action-icon">
                  <Circle size={18} />
                  <small className="quick-action-badge">{pendingItemsCount}</small>
                </span>
                <span className="quick-action-label">Pendentes</span>
              </button>
              <button
                className="quick-action"
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  document.getElementById("panorama")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="quick-action-icon">
                  <Wallet size={18} />
                </span>
                <span className="quick-action-label">Resumo</span>
              </button>
            </div>

            <DashboardCharts fairs={fairs} items={items} selectedFair={selectedFair} />
          </section>

          <section className="fair-panel">
            <div className="fair-header">
              <button className="icon-button" type="button" aria-label="Voltar" onClick={() => triggerHaptic("light")}>
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2>{selectedFair.label}</h2>
                <p>{selectedFair.memberCount} pessoas</p>
              </div>
              <div className="header-actions">
                <button className="ghost-button" type="button" onClick={() => triggerHaptic("light")}>
                  <Share2 size={17} />
                  Compartilhar
                </button>
                <button className="icon-button" type="button" aria-label="Editar" onClick={() => triggerHaptic("light")}>
                  <Edit3 size={18} />
                </button>
                <button className="primary-button" type="button" onClick={() => triggerHaptic("light")}>
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
                    <button
                      className="icon-button compact"
                      type="button"
                      aria-label={`Editar ${item.name}`}
                      onClick={() => triggerHaptic("light")}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="icon-button compact"
                      type="button"
                      aria-label={`Excluir ${item.name}`}
                      onClick={() => triggerHaptic("light")}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      className={item.purchased ? "status-button done" : "status-button"}
                      type="button"
                      aria-label={item.purchased ? `${item.name} comprado` : `Marcar ${item.name} como comprado`}
                      onClick={() => {
                        triggerHaptic("success");
                        togglePurchased(item.id);
                      }}
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
        <a className="bottom-tab active" href="#feiras" onClick={() => triggerHaptic("selection")}>
          <ShoppingBasket size={22} />
          <span>Feiras</span>
        </a>
        <a className="bottom-tab" href="#calendario" onClick={() => triggerHaptic("selection")}>
          <CalendarDays size={22} />
          <span>Calendario</span>
        </a>
        <a className="bottom-tab" href="#orcamento" onClick={() => triggerHaptic("selection")}>
          <Wallet size={22} />
          <span>Orcamento</span>
        </a>
        <a className="bottom-tab" href="#perfil" onClick={() => triggerHaptic("selection")}>
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

type DashboardChartsProps = {
  fairs: Fair[];
  items: FairItem[];
  selectedFair: Fair;
};

function DashboardCharts({ fairs, items, selectedFair }: DashboardChartsProps) {
  const trendFairs = fairs.slice(0, 4).reverse();
  const [selectedTrendIndex, setSelectedTrendIndex] = useState(Math.max(trendFairs.length - 1, 0));
  const selectedTrend = trendFairs[Math.min(selectedTrendIndex, trendFairs.length - 1)] ?? selectedFair;
  const purchasedCount = items.filter((item) => item.purchased).length;
  const purchasedPercent = getPercent(purchasedCount, items.length);

  return (
    <section className="dashboard-charts" id="panorama" aria-label="Panorama da feira">
      <div className="dashboard-heading">
        <h2>Panorama</h2>
      </div>

      <div className="chart-grid">
        <section className="mini-chart circle-panel" aria-label="Itens comprados">
          <div className="chart-label">
            <span>Comprados</span>
            <strong>
              {purchasedCount}/{items.length}
            </strong>
          </div>
          <div className="circle-chart-wrap">
            <svg className="circle-chart" viewBox="0 0 80 80" aria-hidden="true">
              <circle className="circle-chart-bg" cx="40" cy="40" r="30" pathLength="100" />
              <circle
                className="circle-chart-progress"
                cx="40"
                cy="40"
                r="30"
                pathLength="100"
                strokeDasharray={`${purchasedPercent} 100`}
              />
            </svg>
            <div className="circle-center">
              <strong>{purchasedPercent}%</strong>
              <span>itens</span>
            </div>
          </div>
        </section>

        <section className="mini-chart trend-panel" aria-label="Ultimos meses">
          <div className="chart-label">
            <span>Ultimos meses</span>
          </div>
          <MiniTrendChart fairs={trendFairs} selectedIndex={selectedTrendIndex} onSelect={setSelectedTrendIndex} />
          <p className="trend-meta">
            <strong>{selectedTrend.label}</strong>
            <span>{formatCurrency(selectedTrend.total)}</span>
          </p>
        </section>
      </div>
    </section>
  );
}

type MiniTrendChartProps = {
  fairs: Fair[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function MiniTrendChart({ fairs, selectedIndex, onSelect }: MiniTrendChartProps) {
  const values = fairs.map((fair) => fair.total);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 80 : (index / (values.length - 1)) * 160,
    y: 46 - ((value - min) / range) * 34
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const selectPoint = (index: number) => {
    triggerHaptic("selection");
    onSelect(index);
  };
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPoint(index);
    }
  };

  return (
    <svg className="trend-chart" viewBox="0 0 160 56" role="img" aria-label="Evolucao de gastos">
      <polyline className="trend-line" points={polyline} />
      {points.map((point, index) => (
        <g
          aria-label={`${fairs[index].label}: ${formatCurrency(fairs[index].total)}`}
          className={index === selectedIndex ? "trend-point active" : "trend-point"}
          key={fairs[index].id}
          onClick={() => selectPoint(index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          role="button"
          tabIndex={0}
        >
          <circle className="trend-hit" cx={point.x} cy={point.y} r="10" />
          <circle className="trend-dot" cx={point.x} cy={point.y} r="3" />
        </g>
      ))}
    </svg>
  );
}

function Metric({ label, value, icon, tone }: MetricProps) {
  return (
    <div className={tone ? `metric ${tone}` : "metric"}>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function getPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(Math.round((value / total) * 100), 100);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export default App;
