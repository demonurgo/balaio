import {
  ArrowLeft,
  Apple,
  Beef,
  CalendarDays,
  Candy,
  Carrot,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CupSoda,
  Edit3,
  Fish,
  ImagePlus,
  LayoutList,
  LogOut,
  Milk,
  Minus,
  Moon,
  MoreHorizontal,
  Plus,
  Sandwich,
  Share2,
  ShieldCheck,
  ShoppingBasket,
  SprayCan,
  StickyNote,
  Store,
  Sun,
  Tag,
  Trash2,
  UserRound,
  Wallet,
  X
} from "lucide-react";
import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthScreen } from "./auth/AuthScreen";
import { triggerHaptic, triggerHapticDuration } from "./lib/haptics";
import { socket } from "./lib/realtime";
import { playSound } from "./lib/sound";
import { useAuthStore } from "./state/useAuthStore";
import { useFairStore } from "./state/useFairStore";
import type { Fair, FairItem } from "./state/useFairStore";
import { useStockStore } from "./state/useStockStore";
import type { StockItem } from "./state/useStockStore";
import { useThemeStore } from "./state/useThemeStore";

const emptyFair = {
  id: "empty",
  name: "Sem feira",
  label: "Sem feira",
  month: 1,
  year: 2026,
  budget: 1,
  total: 0,
  memberCount: 0
};

type View = "feiras" | "minhas-feiras" | "feira" | "produto" | "calendario" | "orcamento" | "estoque" | "perfil";
type RealtimeStatus = "online" | "unstable" | "offline";
type RouteState = {
  view: View;
  fairId?: string;
  itemId?: string;
};

function getRouteFromHash(): RouteState {
  if (typeof window === "undefined") {
    return { view: "feiras" };
  }

  const [view, fairId, itemId] = window.location.hash.replace("#", "").split("/");

  if (view === "feira" && fairId) {
    return { view: "feira", fairId };
  }

  if (view === "produto" && fairId && itemId) {
    return { view: "produto", fairId, itemId };
  }

  if (view === "minhas-feiras" || view === "calendario" || view === "orcamento" || view === "estoque" || view === "perfil") {
    return { view };
  }

  return { view: "feiras" };
}

function App() {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const loadMe = useAuthStore((state) => state.loadMe);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [route, setRoute] = useState<RouteState>(getRouteFromHash);
  const view = route.view;
  const fairs = useFairStore((state) => state.fairs);
  const fairStatus = useFairStore((state) => state.status);
  const fairError = useFairStore((state) => state.error);
  const loadFairs = useFairStore((state) => state.loadFairs);
  const selectedFairId = useFairStore((state) => state.selectedFairId);
  const selectFair = useFairStore((state) => state.selectFair);
  const itemsByFair = useFairStore((state) => state.itemsByFair);
  const items = useMemo(() => itemsByFair[selectedFairId] ?? [], [itemsByFair, selectedFairId]);
  const togglePurchased = useFairStore((state) => state.togglePurchased);
  const updateItem = useFairStore((state) => state.updateItem);
  const createFair = useFairStore((state) => state.createFair);
  const updateFair = useFairStore((state) => state.updateFair);
  const createItem = useFairStore((state) => state.createItem);
  const deleteFair = useFairStore((state) => state.deleteFair);
  const deleteItem = useFairStore((state) => state.deleteItem);
  const stockItems = useStockStore((state) => state.items);
  const stockStatus = useStockStore((state) => state.status);
  const stockError = useStockStore((state) => state.error);
  const loadStock = useStockStore((state) => state.loadStock);
  const consumeStockItem = useStockStore((state) => state.consumeItem);
  const restoreStockItem = useStockStore((state) => state.restoreItem);
  const selectedFair = fairs.find((fair) => fair.id === selectedFairId) ?? fairs[0] ?? emptyFair;
  const latestFairs = useMemo(() => fairs.slice(0, 3), [fairs]);
  const totalItemsCount = useMemo(() => Object.values(itemsByFair).reduce((count, fairItems) => count + fairItems.length, 0), [itemsByFair]);
  const pendingItemsCount = useMemo(() => items.filter((item) => !item.purchased).length, [items]);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const logoSrc =
    theme === "dark"
      ? "/assets/logo/balaio-logo-horizontal-dark.svg"
      : "/assets/logo/balaio-logo-horizontal.svg";
  const desktopBrandRef = useRef<HTMLImageElement>(null);
  const mobileBrandRef = useRef<HTMLImageElement>(null);
  const [fairMenuOpen, setFairMenuOpen] = useState(false);
  const [bottomTabsHidden, setBottomTabsHidden] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(socket.connected ? "online" : "unstable");

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void loadFairs();
      void loadStock();
    }
  }, [authStatus, loadFairs, loadStock]);

  useEffect(() => {
    const syncView = () => setRoute(getRouteFromHash());
    syncView();
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  useEffect(() => {
    if ((route.view === "feira" || route.view === "produto") && route.fairId) {
      selectFair(route.fairId);
    }
  }, [route.fairId, route.view, selectFair]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !selectedFairId) {
      return;
    }

    socket.connect();
    socket.emit("fair:join", { fairId: selectedFairId });

    const refresh = () => {
      void loadFairs();
      void loadStock();
    };
    const markOnline = () => setRealtimeStatus("online");
    const markUnstable = () => setRealtimeStatus("unstable");
    const markOffline = () => setRealtimeStatus("offline");
    socket.on("connect", markOnline);
    socket.on("connect_error", markUnstable);
    socket.on("disconnect", markOffline);
    socket.on("fair:updated", refresh);
    socket.on("fair:deleted", refresh);
    socket.on("item:created", refresh);
    socket.on("item:updated", refresh);
    socket.on("item:deleted", refresh);

    return () => {
      socket.emit("fair:leave", { fairId: selectedFairId });
      socket.off("connect", markOnline);
      socket.off("connect_error", markUnstable);
      socket.off("disconnect", markOffline);
      socket.off("fair:updated", refresh);
      socket.off("fair:deleted", refresh);
      socket.off("item:created", refresh);
      socket.off("item:updated", refresh);
      socket.off("item:deleted", refresh);
    };
  }, [authStatus, loadFairs, loadStock, selectedFairId]);

  const totals = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const remaining = selectedFair.budget - total;
    const percent = selectedFair.budget > 0 ? Math.min(Math.round((total / selectedFair.budget) * 100), 999) : 0;

    return { total, remaining, percent };
  }, [items, selectedFair.budget]);
  const routeItem = items.find((item) => item.id === route.itemId) ?? items[0];

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

  const handleCreateFair = async () => {
    triggerHaptic("medium");
    const next = getNextFairDate(fairs[0]);
    const fair = await createFair({
      month: next.month,
      year: next.year,
      budget: 0
    });
    window.location.hash = `feira/${fair.id}`;
  };

  useEffect(() => {
    let previousScrollY = window.scrollY;
    let ticking = false;

    const syncBottomTabs = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - previousScrollY;

      if (currentScrollY < 24) {
        setBottomTabsHidden(false);
      } else if (delta > 8) {
        setBottomTabsHidden(true);
      } else if (delta < -8) {
        setBottomTabsHidden(false);
      }

      previousScrollY = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(syncBottomTabs);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openLatestFair = () => {
    triggerHaptic("selection");
    const latestFair = fairs[0] ?? selectedFair;

    if (latestFair.id === "empty") {
      window.location.hash = "feiras";
      return;
    }

    selectFair(latestFair.id);
    window.location.hash = `feira/${latestFair.id}`;
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
          <a className={view === "feiras" || view === "minhas-feiras" || view === "feira" || view === "produto" ? "nav-item active" : "nav-item"} href="#feiras" onClick={() => triggerHaptic("selection")}>
            <ShoppingBasket size={19} />
            Feiras
          </a>
          <a
            className={view === "calendario" ? "nav-item active" : "nav-item"}
            href="#calendario"
            onClick={() => triggerHaptic("selection")}
          >
            <CalendarDays size={19} />
            Calendário
          </a>
          <a
            className={view === "orcamento" ? "nav-item active" : "nav-item"}
            href="#orcamento"
            onClick={() => triggerHaptic("selection")}
          >
            <Wallet size={19} />
            Orçamento
          </a>
          <a className={view === "estoque" ? "nav-item active" : "nav-item"} href="#estoque" onClick={() => triggerHaptic("selection")}>
            <Store size={19} />
            Estoque
          </a>
          <a className={view === "perfil" ? "nav-item active" : "nav-item"} href="#perfil" onClick={() => triggerHaptic("selection")}>
            <UserRound size={19} />
            Perfil
          </a>
        </nav>
      </aside>

      <section className="content">
        {view === "feiras" ? (
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
          </header>
        ) : null}

        {view === "perfil" ? (
          <ProfilePage
            user={user}
            fairsCount={fairs.length}
            itemsCount={totalItemsCount}
            logout={logout}
            theme={theme}
            toggleTheme={toggleTheme}
            updateProfile={updateProfile}
          />
        ) : view === "estoque" ? (
          <StockPage
            consumeItem={consumeStockItem}
            error={stockError}
            items={stockItems}
            restoreItem={restoreStockItem}
            status={stockStatus}
          />
        ) : view === "produto" && routeItem ? (
          <ProductPage
            deleteItem={deleteItem}
            fair={selectedFair}
            item={routeItem}
            key={routeItem.id}
            onBack={() => {
              triggerHaptic("light");
              window.location.hash = `feira/${selectedFair.id}`;
            }}
            togglePurchased={togglePurchased}
            updateItem={updateItem}
          />
        ) : view === "feira" ? (
          <FairPage
            deleteFair={deleteFair}
            deleteItem={deleteItem}
            fair={selectedFair}
            items={items}
            createItem={createItem}
            onBack={() => {
              triggerHaptic("light");
              window.location.hash = "feiras";
            }}
            onOpenProduct={(itemId) => {
              triggerHaptic("selection");
              window.location.hash = `produto/${selectedFair.id}/${itemId}`;
            }}
            realtimeStatus={realtimeStatus}
            togglePurchased={togglePurchased}
            totals={totals}
            updateFair={updateFair}
            updateItem={updateItem}
          />
        ) : view === "minhas-feiras" ? (
          <AllFairsPage
            deleteFair={deleteFair}
            fairError={fairError}
            fairStatus={fairStatus}
            fairs={fairs}
            onBack={() => {
              triggerHaptic("light");
              window.location.hash = "feiras";
            }}
            onOpen={(fairId) => {
              triggerHaptic("selection");
              selectFair(fairId);
              window.location.hash = `feira/${fairId}`;
            }}
            selectedFairId={selectedFairId}
          />
        ) : (
        <div className="workspace">
          <section className="month-panel" id="feiras">
            <div className="section-heading">
              <div>
                <h1>Minhas feiras</h1>
              </div>
              <div className="fair-menu">
                <button
                  className="icon-button"
                  type="button"
                  aria-expanded={fairMenuOpen}
                  aria-label="Mais opções"
                  onClick={() => {
                    triggerHaptic("light");
                    setFairMenuOpen((current) => !current);
                  }}
                >
                  <MoreHorizontal size={20} />
                </button>
                {fairMenuOpen ? (
                  <div className="fair-menu-popover">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setFairMenuOpen(false);
                        window.location.hash = "minhas-feiras";
                      }}
                    >
                      Ver todas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFairMenuOpen(false);
                        void handleCreateFair();
                      }}
                    >
                      Adicionar feira
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="fair-list">
              {fairStatus === "loading" ? (
                <p className="inline-state">Carregando feiras...</p>
              ) : null}
              {fairStatus === "error" ? (
                <p className="inline-state error">{fairError}</p>
              ) : null}
              {latestFairs.map((fair) => {
                const isActive = fair.id === selectedFairId;
                const progress = fair.budget > 0 ? Math.min(Math.round((fair.total / fair.budget) * 100), 100) : 0;

                return (
                  <DashboardFairRow
                    deleteFair={deleteFair}
                    fair={fair}
                    isActive={isActive}
                    key={fair.id}
                    onOpen={() => {
                      triggerHaptic("selection");
                      selectFair(fair.id);
                      window.location.hash = `feira/${fair.id}`;
                    }}
                    progress={progress}
                  />
                );
              })}
            </div>

            <div className="dashboard-heading quick-actions-heading">
              <h2>Ações rápidas</h2>
            </div>

            <div className="quick-actions" aria-label="Acessos rapidos">
              <button
                className="quick-action"
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  selectFair(fairs[0]?.id ?? selectedFair.id);
                  window.location.hash = `feira/${fairs[0]?.id ?? selectedFair.id}`;
                }}
              >
                <span className="quick-action-icon">
                  <ShoppingBasket size={18} />
                </span>
                <span className="quick-action-label">Feira atual</span>
              </button>
              <button
                className="quick-action"
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  window.location.hash = `feira/${selectedFair.id}`;
                }}
              >
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
              <Metric label="Orçamento" value={formatCurrency(selectedFair.budget)} icon={<Wallet size={18} />} />
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
        )}
      </section>

      <nav className={bottomTabsHidden ? "bottom-tabs hidden" : "bottom-tabs"} aria-label="Navegação principal">
        <a className={view === "feiras" ? "bottom-tab active" : "bottom-tab"} href="#feiras" onClick={() => triggerHaptic("selection")}>
          <LayoutList size={22} />
          <span>Dashboard</span>
        </a>
        <a
          className={view === "minhas-feiras" || view === "feira" || view === "produto" ? "bottom-tab active" : "bottom-tab"}
          href={fairs[0] ? `#feira/${fairs[0].id}` : "#feiras"}
          onClick={(event) => {
            event.preventDefault();
            openLatestFair();
          }}
        >
          <ShoppingBasket size={22} />
          <span>Feiras</span>
        </a>
        <a className={view === "orcamento" ? "bottom-tab active" : "bottom-tab"} href="#orcamento" onClick={() => triggerHaptic("selection")}>
          <Wallet size={22} />
          <span>Orçamento</span>
        </a>
        <a className={view === "estoque" ? "bottom-tab active" : "bottom-tab"} href="#estoque" onClick={() => triggerHaptic("selection")}>
          <Store size={22} />
          <span>Estoque</span>
        </a>
        <a className={view === "perfil" ? "bottom-tab active" : "bottom-tab"} href="#perfil" onClick={() => triggerHaptic("selection")}>
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

type DashboardFairRowProps = {
  deleteFair: (fairId: string) => Promise<void>;
  fair: Fair;
  isActive: boolean;
  onOpen: () => void;
  progress: number;
};

type AllFairsPageProps = {
  deleteFair: (fairId: string) => Promise<void>;
  fairError: string;
  fairStatus: "idle" | "loading" | "ready" | "error";
  fairs: Fair[];
  onBack: () => void;
  onOpen: (fairId: string) => void;
  selectedFairId: string;
};

type ProfilePageProps = {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  fairsCount: number;
  itemsCount: number;
  logout: () => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  updateProfile: (values: { firstName: string; lastName: string; birthDate: string; email: string }) => Promise<void>;
};

type StockPageProps = {
  consumeItem: (stockItemId: string) => Promise<void>;
  error: string;
  items: StockItem[];
  restoreItem: (stockItemId: string) => Promise<void>;
  status: "idle" | "loading" | "ready" | "error";
};

type UpdateFairItem = (itemId: string, input: Partial<Omit<FairItem, "id" | "fairId" | "totalPrice">>) => Promise<void>;
type CreateFairItem = (fairId: string, input: { name: string; quantity?: number; unitPrice?: number; unit?: string }) => Promise<void>;
type UpdateFair = (fairId: string, input: Partial<Pick<Fair, "name" | "month" | "year" | "budget">>) => Promise<void>;

type FairPageProps = {
  deleteFair: (fairId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  fair: Fair;
  items: FairItem[];
  createItem: CreateFairItem;
  onBack: () => void;
  onOpenProduct: (itemId: string) => void;
  realtimeStatus: RealtimeStatus;
  togglePurchased: (itemId: string) => Promise<void>;
  totals: { total: number; remaining: number; percent: number };
  updateFair: UpdateFair;
  updateItem: UpdateFairItem;
};

type ProductPageProps = {
  deleteItem: (itemId: string) => Promise<void>;
  fair: Fair;
  item: FairItem;
  onBack: () => void;
  togglePurchased: (itemId: string) => Promise<void>;
  updateItem: UpdateFairItem;
};

type ItemField = "name" | "price" | "quantity";
type ItemSortMode = "manual" | "category" | "priceAsc" | "priceDesc";
type SwipeLock = "scroll" | "swipe" | null;
type SwipeState = {
  pointerId: number;
  startX: number;
  startY: number;
  rawX: number;
  visualX: number;
  lock: SwipeLock;
  armed: boolean;
};

const SWIPE_START_DISTANCE = 8;
const SWIPE_DELETE_DISTANCE = 118;
const SWIPE_REVEAL_DISTANCE = 126;
const CATEGORY_COLORS = ["#f4b36a", "#f29b73", "#ef8f8f", "#9ec3f1", "#f6d957", "#c7df8f", "#82c7dc", "#f2a0a1", "#f0a9ce", "#8fd3c7", "#d8d6cf"];
const CATEGORY_OPTIONS = ["Carnes", "Legumes", "Frutas", "Bebidas", "Lanches", "Laticínios", "Peixes", "Doces", "Mercearia", "Limpeza", "Outros"];
const CATEGORY_META = [
  { label: "Carnes", icon: Beef, color: "#f4b36a", keywords: ["carne", "carnes", "acougue", "açougue", "frango", "bovina", "suina", "suína", "alcatra", "patinho", "maminha", "coxao", "coxa", "carne moida"] },
  { label: "Legumes", icon: Carrot, color: "#f29b73", keywords: ["legume", "legumes", "verdura", "verduras", "hortifruti", "cenoura", "batata", "tomate", "alface", "cebola", "pepino", "abobrinha", "mandioca", "brocolis", "brócolis"] },
  { label: "Frutas", icon: Apple, color: "#ef8f8f", keywords: ["fruta", "frutas", "banana", "maca", "maçã", "uva", "laranja", "mamao", "mamão", "abacaxi", "melancia", "limao", "limão"] },
  { label: "Bebidas", icon: CupSoda, color: "#9ec3f1", keywords: ["bebida", "bebidas", "suco", "refrigerante", "agua", "água", "cerveja", "vinho"] },
  { label: "Lanches", icon: Sandwich, color: "#f6d957", keywords: ["lanche", "lanches", "padaria", "pao", "pão", "sanduiche", "sanduíche"] },
  { label: "Laticínios", icon: Milk, color: "#c7df8f", keywords: ["leite", "laticinio", "laticínios", "laticinios", "queijo", "iogurte", "requeijao", "requeijão", "manteiga"] },
  { label: "Peixes", icon: Fish, color: "#82c7dc", keywords: ["peixe", "peixes", "frutos do mar", "camarao", "camarão", "tilapia", "tilápia", "salmao", "salmão"] },
  { label: "Doces", icon: Candy, color: "#f2a0a1", keywords: ["doce", "doces", "sobremesa", "chocolate", "biscoito"] },
  { label: "Mercearia", icon: Store, color: "#f0a9ce", keywords: ["mercearia", "mercado", "supermercado", "mantimento", "mantimentos", "grao", "graos", "grão", "grãos", "arroz", "feijao", "feijão", "macarrao", "macarrão", "farinha", "oleo", "óleo"] },
  {
    label: "Limpeza",
    icon: SprayCan,
    color: "#8fd3c7",
    keywords: [
      "limpeza",
      "higiene",
      "lavanderia",
      "detergente",
      "desinfetante",
      "sabao",
      "amaciante",
      "agua sanitaria",
      "cloro",
      "esponja",
      "vassoura",
      "rodo",
      "pano",
      "alcool",
      "multiuso"
    ]
  },
  { label: "Outros", icon: Tag, color: "#d8d6cf", keywords: ["outros", "sem categoria", "diversos"] }
];

function getResistedSwipe(distance: number) {
  return -Math.min(SWIPE_REVEAL_DISTANCE, distance * 0.82);
}

function DashboardFairRow({ deleteFair, fair, isActive, onOpen, progress }: DashboardFairRowProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [swipeArmed, setSwipeArmed] = useState(false);
  const swipe = useRef<SwipeState | null>(null);
  const swipeElement = useRef<HTMLDivElement | null>(null);
  const detachGlobalSwipe = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      detachGlobalSwipe.current?.();
    };
  }, []);

  const suppressNextClick = () => {
    suppressClick.current = true;

    if (suppressClickTimer.current) {
      window.clearTimeout(suppressClickTimer.current);
    }

    suppressClickTimer.current = window.setTimeout(() => {
      suppressClick.current = false;
      suppressClickTimer.current = null;
    }, 360);
  };

  function detachSwipeRelease() {
    detachGlobalSwipe.current?.();
    detachGlobalSwipe.current = null;
  }

  function releaseSwipePointer(pointerId: number) {
    const element = swipeElement.current;

    if (element?.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }

    swipeElement.current = null;
  }

  function attachSwipeRelease(element: HTMLDivElement) {
    detachSwipeRelease();
    swipeElement.current = element;

    const finish = (event: globalThis.PointerEvent) => {
      finishSwipe(event.pointerId, event);
    };

    window.addEventListener("pointerup", finish, { capture: true });
    window.addEventListener("pointercancel", finish, { capture: true });
    detachGlobalSwipe.current = () => {
      window.removeEventListener("pointerup", finish, { capture: true });
      window.removeEventListener("pointercancel", finish, { capture: true });
    };
  }

  const startPointer = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || isRemoving) {
      return;
    }

    swipe.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rawX: 0,
      visualX: 0,
      lock: null,
      armed: false
    };
  };

  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    const currentSwipe = swipe.current;

    if (!currentSwipe || currentSwipe.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - currentSwipe.startX;
    const deltaY = event.clientY - currentSwipe.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!currentSwipe.lock) {
      if (absX < SWIPE_START_DISTANCE && absY < SWIPE_START_DISTANCE) {
        return;
      }

      if (absY > absX * 1.15) {
        currentSwipe.lock = "scroll";
        return;
      }

      if (deltaX < -SWIPE_START_DISTANCE) {
        currentSwipe.lock = "swipe";
        event.currentTarget.setPointerCapture(event.pointerId);
        attachSwipeRelease(event.currentTarget);
        setIsSwiping(true);
        suppressNextClick();
        triggerHaptic("selection");
      } else {
        currentSwipe.lock = "scroll";
        return;
      }
    }

    if (currentSwipe.lock !== "swipe") {
      return;
    }

    event.preventDefault();

    const distance = Math.max(0, -deltaX);
    const nextSwipeX = getResistedSwipe(distance);
    const nextArmed = distance >= SWIPE_DELETE_DISTANCE;

    currentSwipe.rawX = distance;
    currentSwipe.visualX = Math.abs(nextSwipeX);
    setSwipeX(nextSwipeX);

    if (nextArmed !== currentSwipe.armed) {
      currentSwipe.armed = nextArmed;
      setSwipeArmed(nextArmed);
      triggerHaptic(nextArmed ? "medium" : "light");
    }
  };

  const resetSwipe = () => {
    swipe.current = null;
    detachSwipeRelease();
    setIsSwiping(false);
    setSwipeArmed(false);
    setSwipeX(0);
  };

  const deleteFromSwipe = () => {
    if (!window.confirm(`Excluir a feira ${fair.label}?`)) {
      resetSwipe();
      triggerHaptic("warning");
      return;
    }

    const exitDistance = -Math.min(window.innerWidth || 360, 520);

    swipe.current = null;
    detachSwipeRelease();
    setIsSwiping(false);
    setSwipeArmed(true);
    setIsRemoving(true);
    setSwipeX(exitDistance);
    triggerHaptic("error");

    window.setTimeout(() => {
      void deleteFair(fair.id).catch(() => {
        setIsRemoving(false);
        setSwipeArmed(false);
        setSwipeX(0);
        triggerHaptic("warning");
      });
    }, 150);
  };

  const shouldDeleteSwipe = (currentSwipe: SwipeState) => {
    return currentSwipe.armed || currentSwipe.rawX >= SWIPE_DELETE_DISTANCE || currentSwipe.visualX >= SWIPE_REVEAL_DISTANCE * 0.9;
  };

  function finishSwipe(pointerId: number, event?: { preventDefault: () => void }) {
    const currentSwipe = swipe.current;

    if (!currentSwipe || currentSwipe.pointerId !== pointerId) {
      return;
    }

    swipe.current = null;
    releaseSwipePointer(pointerId);
    detachSwipeRelease();

    if (currentSwipe.lock !== "swipe") {
      setSwipeX(0);
      setSwipeArmed(false);
      return;
    }

    event?.preventDefault();
    suppressNextClick();

    if (shouldDeleteSwipe(currentSwipe)) {
      deleteFromSwipe();
      return;
    }

    setIsSwiping(false);
    setSwipeArmed(false);
    setSwipeX(0);
  }

  const cancelPointer = (event: PointerEvent<HTMLDivElement>) => {
    const currentSwipe = swipe.current;

    if (currentSwipe?.lock === "swipe" && shouldDeleteSwipe(currentSwipe)) {
      releaseSwipePointer(event.pointerId);
      deleteFromSwipe();
      return;
    }

    resetSwipe();
  };

  const stopSuppressedClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!suppressClick.current) {
      return;
    }

    suppressClick.current = false;
    if (suppressClickTimer.current) {
      window.clearTimeout(suppressClickTimer.current);
      suppressClickTimer.current = null;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const fairSwipeStyle =
    swipeX !== 0 || isSwiping || isRemoving
      ? ({ transform: `translate3d(${swipeX}px, 0, 0)` } as CSSProperties)
      : undefined;

  return (
    <div
      className={swipeArmed ? "fair-swipe-shell armed" : "fair-swipe-shell"}
      style={{ "--swipe-progress": String(Math.min(Math.abs(swipeX) / SWIPE_REVEAL_DISTANCE, 1)) } as CSSProperties}
    >
      <div className="fair-delete-action" aria-hidden="true">
        <Trash2 size={18} />
        <span>Deletar</span>
      </div>
      <div
        onPointerCancel={cancelPointer}
        onPointerDown={startPointer}
        onPointerMove={movePointer}
        onPointerUp={(event) => finishSwipe(event.pointerId, event)}
      >
        <button
          className={`${isActive ? "fair-row active" : "fair-row"}${isSwiping ? " swiping" : ""}${isRemoving ? " removing" : ""}`}
          style={fairSwipeStyle}
          type="button"
          onClick={onOpen}
          onClickCapture={stopSuppressedClick}
        >
          <span>
            <strong>{fair.label}</strong>
            <small>{fair.memberCount} pessoas</small>
          </span>
          <span className="money-block">
            <small>Total</small>
            <strong>{formatCurrency(fair.total)}</strong>
          </span>
          <span className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </span>
        </button>
      </div>
    </div>
  );
}

function AllFairsPage({ deleteFair, fairError, fairStatus, fairs, onBack, onOpen, selectedFairId }: AllFairsPageProps) {
  return (
    <section className="all-fairs-page" aria-label="Minhas feiras">
      <header className="fair-screen-header">
        <button className="icon-button screen-back-button" type="button" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1>Minhas feiras</h1>
          <p>{fairs.length} feiras</p>
        </div>
      </header>

      <div className="fair-list">
        {fairStatus === "loading" ? <p className="inline-state">Carregando feiras...</p> : null}
        {fairStatus === "error" ? <p className="inline-state error">{fairError}</p> : null}
        {fairs.map((fair) => {
          const progress = fair.budget > 0 ? Math.min(Math.round((fair.total / fair.budget) * 100), 100) : 0;

          return (
            <DashboardFairRow
              deleteFair={deleteFair}
              fair={fair}
              isActive={fair.id === selectedFairId}
              key={fair.id}
              onOpen={() => onOpen(fair.id)}
              progress={progress}
            />
          );
        })}
      </div>
    </section>
  );
}

function getCategoryLabel(item: FairItem) {
  const category = item.category?.trim();
  const inferred = getCategoryMeta(item.name)?.label;
  const normalizedCategory = normalizeCategoryLabel(category ?? "");

  if (!category || normalizedCategory === "outros" || normalizedCategory === "sem categoria") {
    return inferred ?? "Outros";
  }

  return getCategoryMeta(category)?.label ?? category;
}

function normalizeCategoryLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCategoryMeta(label: string) {
  const normalized = normalizeCategoryLabel(label);

  return CATEGORY_META.find((entry) => entry.keywords.some((keyword) => normalized.includes(normalizeCategoryLabel(keyword))));
}

function getCategoryIcon(label: string) {
  return getCategoryMeta(label)?.icon ?? ShoppingBasket;
}

function getCategoryColor(label: string, index: number) {
  return getCategoryMeta(label)?.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function getCategoryBreakdown(items: FairItem[]) {
  const totals = new Map<string, { label: string; value: number; count: number }>();

  items.forEach((item) => {
    const label = getCategoryLabel(item);
    const key = label.toLowerCase();
    const current = totals.get(key) ?? { label, value: 0, count: 0 };
    current.value += item.totalPrice;
    current.count += 1;
    totals.set(key, current);
  });

  const total = Array.from(totals.values()).reduce((sum, item) => sum + item.value, 0);
  const categories = Array.from(totals.values()).sort((a, b) => b.value - a.value).map((item, index) => ({
      ...item,
      color: getCategoryColor(item.label, index),
      Icon: getCategoryIcon(item.label),
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));

  return { categories, total };
}

function FairPage({ deleteFair, deleteItem, fair, items, createItem, onBack, onOpenProduct, realtimeStatus, togglePurchased, totals, updateFair, updateItem }: FairPageProps) {
  const purchasedItems = items.filter((item) => item.purchased);
  const purchasedTotal = purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const pendingTotal = items.filter((item) => !item.purchased).reduce((sum, item) => sum + item.totalPrice, 0);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(items), [items]);
  const categoryColorByLabel = useMemo(
    () => new Map(categoryBreakdown.categories.map((category) => [category.label.toLowerCase(), category.color])),
    [categoryBreakdown.categories]
  );
  const [itemSortMode, setItemSortMode] = useState<ItemSortMode>("manual");
  const sortedItems = useMemo(() => {
    const order = new Map(items.map((item, index) => [item.id, index]));
    const nextItems = [...items];
    const getOrder = (item: FairItem) => order.get(item.id) ?? 0;

    if (itemSortMode === "category") {
      return nextItems.sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b), "pt-BR") || getOrder(a) - getOrder(b));
    }

    if (itemSortMode === "priceAsc") {
      return nextItems.sort((a, b) => a.totalPrice - b.totalPrice || getOrder(a) - getOrder(b));
    }

    if (itemSortMode === "priceDesc") {
      return nextItems.sort((a, b) => b.totalPrice - a.totalPrice || getOrder(a) - getOrder(b));
    }

    return nextItems;
  }, [itemSortMode, items]);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(fair.budget).replace(".", ","));
  const [nameDraft, setNameDraft] = useState(fair.name);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", quantity: "1" });
  const [saving, setSaving] = useState(false);
  const [backPressed, setBackPressed] = useState(false);
  const [fairActionsOpen, setFairActionsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const handleBack = () => {
    if (backPressed) {
      return;
    }

    triggerHaptic("selection");
    setBackPressed(true);
    window.setTimeout(onBack, 140);
  };

  const saveBudget = async () => {
    setEditingBudget(false);
    await updateFair(fair.id, { budget: parseMoneyInput(budgetDraft) });
    triggerHaptic("success");
  };

  const saveName = async () => {
    const name = nameDraft.trim();

    if (!name) {
      setNameDraft(fair.name);
      setEditingName(false);
      return;
    }

    setEditingName(false);
    await updateFair(fair.id, { name });
    triggerHaptic("success");
  };

  const saveNewItem = async () => {
    const name = newItem.name.trim();

    if (!name) {
      return;
    }

    setSaving(true);
    await createItem(fair.id, {
      name,
      quantity: parseQuantityInput(newItem.quantity),
      unitPrice: parseMoneyInput(newItem.price)
    });
    setNewItem({ name: "", price: "", quantity: "1" });
    setShowNewItem(false);
    setSaving(false);
    triggerHaptic("success");
  };

  const changeSortMode = (mode: ItemSortMode) => {
    triggerHaptic("selection");
    setItemSortMode(mode);
    setFairActionsOpen(false);
  };

  const deleteCurrentFair = async () => {
    setFairActionsOpen(false);

    if (!window.confirm(`Excluir a feira ${fair.label}?`)) {
      triggerHaptic("warning");
      return;
    }

    triggerHaptic("error");
    await deleteFair(fair.id);
    onBack();
  };

  const realtimeLabel =
    realtimeStatus === "online"
      ? "Tempo real ativo"
      : realtimeStatus === "unstable"
        ? "Conexão instável"
        : "Tempo real offline";

  return (
    <section className="fair-screen" aria-label={`Feira ${fair.label}`}>
      <header className="fair-screen-header">
        <button className={backPressed ? "icon-button screen-back-button is-leaving" : "icon-button screen-back-button"} type="button" aria-label="Voltar" onClick={handleBack}>
          <ArrowLeft size={19} />
        </button>
        <div>
          {editingName ? (
            <input
              autoFocus
              className="fair-title-input"
              value={nameDraft}
              onBlur={() => void saveName()}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveName();
                }
              }}
            />
          ) : (
            <button
              className="fair-title-button"
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setNameDraft(fair.name);
                setEditingName(true);
              }}
            >
              <h1>{fair.label}</h1>
            </button>
          )}
        </div>
        <div className="fair-header-actions">
          <div className="fair-status-wrap">
            <button
              className={`fair-realtime-button ${realtimeStatus}`}
              type="button"
              aria-label={realtimeLabel}
              onClick={() => {
                triggerHaptic("selection");
                setStatusOpen((current) => !current);
                setFairActionsOpen(false);
              }}
            >
              <span />
            </button>
            {statusOpen ? (
              <div className="fair-status-tooltip" role="status">
                <strong>{realtimeLabel}</strong>
                <span>{fair.memberCount} pessoas nesta feira</span>
              </div>
            ) : null}
          </div>
          <div className="fair-menu">
            <button
              className="icon-button fair-menu-button"
              type="button"
              aria-expanded={fairActionsOpen}
              aria-label="Mais opções"
              onClick={() => {
                triggerHaptic("light");
                setFairActionsOpen((current) => !current);
                setStatusOpen(false);
              }}
            >
              <MoreHorizontal size={20} />
            </button>
            {fairActionsOpen ? (
              <div className="fair-menu-popover fair-actions-popover">
                <button className={itemSortMode === "manual" ? "active" : ""} type="button" onClick={() => changeSortMode("manual")}>
                  Ordem original
                </button>
                <button className={itemSortMode === "category" ? "active" : ""} type="button" onClick={() => changeSortMode("category")}>
                  Ordenar por categoria
                </button>
                <button className={itemSortMode === "priceAsc" ? "active" : ""} type="button" onClick={() => changeSortMode("priceAsc")}>
                  Menor preço
                </button>
                <button className={itemSortMode === "priceDesc" ? "active" : ""} type="button" onClick={() => changeSortMode("priceDesc")}>
                  Maior preço
                </button>
                <button className="danger" type="button" onClick={() => void deleteCurrentFair()}>
                  Excluir feira
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="fair-total-line" aria-label="Resumo da feira">
        <span>
          <small>Orçamento</small>
          {editingBudget ? (
            <input
              autoFocus
              className="budget-inline-input"
              inputMode="decimal"
              value={budgetDraft}
              onBlur={() => void saveBudget()}
              onChange={(event) => setBudgetDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveBudget();
                }
              }}
            />
          ) : (
            <button
              className="budget-inline-button"
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setBudgetDraft(String(fair.budget).replace(".", ","));
                setEditingBudget(true);
              }}
            >
              {formatCurrency(fair.budget)}
            </button>
          )}
        </span>
        <span>
          <small>Total</small>
          <strong>{formatCurrency(totals.total)}</strong>
        </span>
        <span>
          <small>Comprado</small>
          <strong>{formatCurrency(purchasedTotal)}</strong>
        </span>
        <span>
          <small>Falta</small>
          <strong>{formatCurrency(pendingTotal)}</strong>
        </span>
      </div>

      <CategoryRingChart categories={categoryBreakdown.categories} total={categoryBreakdown.total} />

      {showNewItem ? (
        <form
          className="new-item-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNewItem();
          }}
        >
          <input
            autoFocus
            placeholder="Nome do item"
            value={newItem.name}
            onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
          />
          <input
            inputMode="decimal"
            placeholder="Preco"
            value={newItem.price}
            onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value }))}
          />
          <input
            inputMode="numeric"
            placeholder="Qtd"
            value={newItem.quantity}
            onChange={(event) => setNewItem((current) => ({ ...current, quantity: event.target.value }))}
          />
          <button type="submit" disabled={saving}>
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowNewItem(false);
            }}
          >
            <X size={16} />
          </button>
        </form>
      ) : null}

      <button
        className="add-item-strip"
        type="button"
        onClick={() => {
          triggerHaptic("medium");
          setShowNewItem(true);
        }}
      >
        <Plus size={18} />
        Adicionar item
      </button>

      <div className="todo-list" aria-label="Itens da feira">
        {items.length === 0 ? <p className="empty-list">Ainda sem itens.</p> : null}
        {sortedItems.map((item) => (
          <FairTodoRow
            categoryColor={categoryColorByLabel.get(getCategoryLabel(item).toLowerCase()) ?? categoryColorByLabel.get("outros") ?? CATEGORY_COLORS[0]}
            deleteItem={deleteItem}
            item={item}
            key={item.id}
            onOpenDetail={() => onOpenProduct(item.id)}
            togglePurchased={togglePurchased}
            updateItem={updateItem}
          />
        ))}
      </div>
    </section>
  );
}

type FairTodoRowProps = {
  categoryColor: string;
  deleteItem: (itemId: string) => Promise<void>;
  item: FairItem;
  onOpenDetail: () => void;
  togglePurchased: (itemId: string) => Promise<void>;
  updateItem: UpdateFairItem;
};
type CategoryBreakdownItem = ReturnType<typeof getCategoryBreakdown>["categories"][number];

function CategoryRingChart({ categories, total }: { categories: CategoryBreakdownItem[]; total: number }) {
  const leading = categories[0];
  const [activeCategory, setActiveCategory] = useState<CategoryBreakdownItem | null>(null);
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const gap = categories.length > 1 ? 34 : 0;
  const available = circumference - gap * categories.length;
  const getDash = (category: CategoryBreakdownItem) => (category.percent / 100) * available;
  const segments = categories.map((category, index) => {
    const dash = getDash(category);
    const offset = categories.slice(0, index).reduce((sum, current) => sum + getDash(current) + gap, 0);
    const sweep = (dash / circumference) * 360;
    const angle = -90 + (offset / circumference) * 360 + sweep * 0.08;
    const iconRadius = 76;

    return {
      category,
      dash,
      offset,
      iconX: 110 + Math.cos((angle * Math.PI) / 180) * iconRadius,
      iconY: 110 + Math.sin((angle * Math.PI) / 180) * iconRadius
    };
  });
  const displayedCategory = activeCategory ?? leading;

  return (
    <section className="category-ring-card" aria-label="Distribuição por categoria">
      <div className="category-ring-copy">
        <small>Categorias</small>
        <strong>{categories.length ? `${leading.percent}% ${leading.label}` : "Sem categorias"}</strong>
      </div>

      <div className="category-ring-visual">
        <svg className="category-ring-svg" viewBox="0 0 220 220" role="img" aria-label="Grafico de categorias">
          {segments.map(({ category, dash, offset, iconX, iconY }) => {
            const strokeDashoffset = -offset;
            const Icon = category.Icon;

            return (
              <g
                className={activeCategory?.label === category.label ? "category-ring-hit active" : "category-ring-hit"}
                key={category.label}
                onClick={() => {
                  triggerHaptic("selection");
                  setActiveCategory((current) => (current?.label === category.label ? null : category));
                }}
              >
                <circle
                  className="category-ring-segment"
                  cx="110"
                  cy="110"
                  r={radius}
                  stroke={category.color}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={strokeDashoffset}
                />
                <foreignObject height="26" width="26" x={iconX - 13} y={iconY - 13}>
                  <span className="category-ring-icon" style={{ backgroundColor: category.color }}>
                    <Icon size={14} />
                  </span>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        <div className="category-ring-center" key={displayedCategory?.label ?? "empty"}>
          <strong>{displayedCategory ? `${displayedCategory.percent}%` : "0%"}</strong>
          <span>{displayedCategory ? displayedCategory.label : "adicione categorias"}</span>
          <small>{formatCurrency(displayedCategory?.value ?? total)}</small>
        </div>
      </div>

    </section>
  );
}

function FairTodoRow({ categoryColor, deleteItem, item, onOpenDetail, togglePurchased, updateItem }: FairTodoRowProps) {
  const [editing, setEditing] = useState<ItemField | null>(null);
  const [draft, setDraft] = useState({
    name: item.name,
    price: String(item.unitPrice).replace(".", ","),
    quantity: String(item.quantity)
  });
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [swipeArmed, setSwipeArmed] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const swipe = useRef<SwipeState | null>(null);
  const swipeElement = useRef<HTMLDivElement | null>(null);
  const detachGlobalSwipe = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      detachGlobalSwipe.current?.();
    };
  }, []);

  const clearPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const suppressNextClick = () => {
    suppressClick.current = true;

    if (suppressClickTimer.current) {
      window.clearTimeout(suppressClickTimer.current);
    }

    suppressClickTimer.current = window.setTimeout(() => {
      suppressClick.current = false;
      suppressClickTimer.current = null;
    }, 360);
  };

  function detachSwipeRelease() {
    detachGlobalSwipe.current?.();
    detachGlobalSwipe.current = null;
  }

  function releaseSwipePointer(pointerId: number) {
    const element = swipeElement.current;

    if (element?.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }

    swipeElement.current = null;
  }

  function attachSwipeRelease(element: HTMLDivElement) {
    detachSwipeRelease();
    swipeElement.current = element;

    const finish = (event: globalThis.PointerEvent) => {
      finishSwipe(event.pointerId, event);
    };

    window.addEventListener("pointerup", finish, { capture: true });
    window.addEventListener("pointercancel", finish, { capture: true });
    detachGlobalSwipe.current = () => {
      window.removeEventListener("pointerup", finish, { capture: true });
      window.removeEventListener("pointercancel", finish, { capture: true });
    };
  }

  const startPointer = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || editing || isRemoving) {
      return;
    }

    if ((event.target as HTMLElement).closest("input")) {
      return;
    }

    swipe.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rawX: 0,
      visualX: 0,
      lock: null,
      armed: false
    };

    if ((event.target as HTMLElement).closest(".item-check-button, input")) {
      return;
    }

    clearPress();
    longPressFired.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      triggerHaptic("medium");
      onOpenDetail();
    }, 520);
  };

  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    const currentSwipe = swipe.current;

    if (!currentSwipe || currentSwipe.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - currentSwipe.startX;
    const deltaY = event.clientY - currentSwipe.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!currentSwipe.lock) {
      if (absX < SWIPE_START_DISTANCE && absY < SWIPE_START_DISTANCE) {
        return;
      }

      if (absY > absX * 1.15) {
        currentSwipe.lock = "scroll";
        clearPress();
        return;
      }

      if (deltaX < -SWIPE_START_DISTANCE) {
        currentSwipe.lock = "swipe";
        event.currentTarget.setPointerCapture(event.pointerId);
        attachSwipeRelease(event.currentTarget);
        clearPress();
        setIsSwiping(true);
        suppressNextClick();
        triggerHaptic("selection");
      } else {
        currentSwipe.lock = "scroll";
        clearPress();
        return;
      }
    }

    if (currentSwipe.lock !== "swipe") {
      return;
    }

    event.preventDefault();

    const distance = Math.max(0, -deltaX);
    const nextSwipeX = getResistedSwipe(distance);
    const nextArmed = distance >= SWIPE_DELETE_DISTANCE;

    currentSwipe.rawX = distance;
    currentSwipe.visualX = Math.abs(nextSwipeX);
    setSwipeX(nextSwipeX);

    if (nextArmed !== currentSwipe.armed) {
      currentSwipe.armed = nextArmed;
      setSwipeArmed(nextArmed);
      triggerHaptic(nextArmed ? "medium" : "light");
    }
  };

  const resetSwipe = () => {
    swipe.current = null;
    detachSwipeRelease();
    clearPress();
    setIsSwiping(false);
    setSwipeArmed(false);
    setSwipeX(0);
  };

  const deleteFromSwipe = () => {
    const exitDistance = -Math.min(window.innerWidth || 360, 520);

    swipe.current = null;
    detachSwipeRelease();
    clearPress();
    setIsSwiping(false);
    setSwipeArmed(true);
    setIsRemoving(true);
    setSwipeX(exitDistance);
    triggerHaptic("error");

    window.setTimeout(() => {
      void deleteItem(item.id).catch(() => {
        setIsRemoving(false);
        setSwipeArmed(false);
        setSwipeX(0);
        triggerHaptic("warning");
      });
    }, 150);
  };

  const shouldDeleteSwipe = (currentSwipe: SwipeState) => {
    return currentSwipe.armed || currentSwipe.rawX >= SWIPE_DELETE_DISTANCE || currentSwipe.visualX >= SWIPE_REVEAL_DISTANCE * 0.9;
  };

  function finishSwipe(pointerId: number, event?: { preventDefault: () => void }) {
    const currentSwipe = swipe.current;

    if (!currentSwipe || currentSwipe.pointerId !== pointerId) {
      clearPress();
      return;
    }

    swipe.current = null;
    releaseSwipePointer(pointerId);
    detachSwipeRelease();
    clearPress();

    if (currentSwipe.lock !== "swipe") {
      setSwipeX(0);
      setSwipeArmed(false);
      return;
    }

    event?.preventDefault();
    suppressNextClick();

    if (shouldDeleteSwipe(currentSwipe)) {
      deleteFromSwipe();
      return;
    }

    setIsSwiping(false);
    setSwipeArmed(false);
    setSwipeX(0);
  }

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    finishSwipe(event.pointerId, event);
  };

  const cancelPointer = (event: PointerEvent<HTMLDivElement>) => {
    const currentSwipe = swipe.current;

    if (currentSwipe?.lock === "swipe" && shouldDeleteSwipe(currentSwipe)) {
      releaseSwipePointer(event.pointerId);
      deleteFromSwipe();
      return;
    }

    resetSwipe();
  };

  const stopSuppressedClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) {
      return;
    }

    suppressClick.current = false;
    if (suppressClickTimer.current) {
      window.clearTimeout(suppressClickTimer.current);
      suppressClickTimer.current = null;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const startEdit = (field: ItemField) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }

    triggerHaptic("selection");
    setDraft({
      name: item.name,
      price: String(item.unitPrice).replace(".", ","),
      quantity: String(item.quantity)
    });
    setEditing(field);
  };

  const commit = (field: ItemField) => {
    if (field === "name") {
      const name = draft.name.trim();

      if (name) {
        void updateItem(item.id, { name });
        triggerHaptic("success");
      }
    }

    if (field === "price") {
      void updateItem(item.id, { unitPrice: parseMoneyInput(draft.price) });
      triggerHaptic("success");
    }

    if (field === "quantity") {
      void updateItem(item.id, { quantity: parseQuantityInput(draft.quantity) });
      triggerHaptic("success");
    }

    setEditing(null);
  };

  const handleFieldKey = (event: KeyboardEvent<HTMLInputElement>, field: ItemField) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(field);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(null);
    }
  };
  const itemSwipeStyle =
    swipeX !== 0 || isSwiping || isRemoving
      ? ({ transform: `translate3d(${swipeX}px, 0, 0)` } as CSSProperties)
      : undefined;

  return (
    <div
      className={swipeArmed ? "todo-swipe-shell armed" : "todo-swipe-shell"}
      style={{ "--swipe-progress": String(Math.min(Math.abs(swipeX) / SWIPE_REVEAL_DISTANCE, 1)) } as CSSProperties}
    >
      <div className="todo-delete-action" aria-hidden="true">
        <Trash2 size={18} />
        <span>Deletar</span>
      </div>

      <div
        className={`${item.purchased ? "todo-item purchased" : "todo-item"}${isSwiping ? " swiping" : ""}${isRemoving ? " removing" : ""}`}
        style={itemSwipeStyle}
        onClickCapture={stopSuppressedClick}
        onPointerCancel={cancelPointer}
        onPointerDown={startPointer}
        onPointerLeave={() => {
          if (swipe.current?.lock !== "swipe") {
            clearPress();
          }
        }}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
      >
        <button
          className="item-check-button"
          style={{ "--item-category-color": categoryColor } as CSSProperties}
          type="button"
          aria-label={item.purchased ? `${item.name} comprado` : `Marcar ${item.name} como comprado`}
          onClick={() => {
            triggerHaptic("success");
            void togglePurchased(item.id);
          }}
        >
          {item.purchased ? <Check size={15} /> : null}
        </button>

        <div className="todo-item-main">
          {editing === "name" ? (
            <input
              autoFocus
              className="todo-inline-input name"
              value={draft.name}
              onBlur={() => commit("name")}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              onKeyDown={(event) => handleFieldKey(event, "name")}
            />
          ) : (
            <button className="todo-name-button" type="button" onClick={() => startEdit("name")}>
              {item.name}
            </button>
          )}
        </div>

        <div className="todo-money">
          {editing === "price" ? (
            <input
              autoFocus
              className="todo-inline-input money"
              inputMode="decimal"
              value={draft.price}
              onBlur={() => commit("price")}
              onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
              onKeyDown={(event) => handleFieldKey(event, "price")}
            />
          ) : (
            <button className="todo-price-button" type="button" onClick={() => startEdit("price")}>
              {formatCurrency(item.unitPrice)}
            </button>
          )}
        </div>

        <div className="todo-quantity">
          {editing === "quantity" ? (
            <input
              autoFocus
              className="todo-inline-input qty"
              inputMode="numeric"
              value={draft.quantity}
              onBlur={() => commit("quantity")}
              onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
              onKeyDown={(event) => handleFieldKey(event, "quantity")}
            />
          ) : (
            <button className="todo-qty-button" type="button" onClick={() => startEdit("quantity")}>
              x{item.quantity}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductPage({ deleteItem, fair, item, onBack, togglePurchased, updateItem }: ProductPageProps) {
  const categoryOptions = useMemo(() => {
    const currentCategory = item.category?.trim();

    if (currentCategory && !CATEGORY_OPTIONS.some((category) => normalizeCategoryLabel(category) === normalizeCategoryLabel(currentCategory))) {
      return [...CATEGORY_OPTIONS, currentCategory];
    }

    return CATEGORY_OPTIONS;
  }, [item.category]);
  const [draft, setDraft] = useState({
    name: item.name,
    price: String(item.unitPrice).replace(".", ","),
    quantity: String(item.quantity),
    category: item.category ?? "",
    notes: item.notes ?? ""
  });
  const [backPressed, setBackPressed] = useState(false);

  const handleBack = () => {
    if (backPressed) {
      return;
    }

    triggerHaptic("selection");
    setBackPressed(true);
    window.setTimeout(onBack, 140);
  };

  const saveProduct = async () => {
    await updateItem(item.id, {
      name: draft.name.trim() || item.name,
      unitPrice: parseMoneyInput(draft.price),
      quantity: parseQuantityInput(draft.quantity),
      category: draft.category.trim(),
      notes: draft.notes.trim()
    });
    triggerHaptic("success");
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      void updateItem(item.id, { imageUrl: String(reader.result ?? "") });
      triggerHaptic("success");
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="product-screen" aria-label={`Produto ${item.name}`}>
      <header className="product-header">
        <button className={backPressed ? "icon-button screen-back-button is-leaving" : "icon-button screen-back-button"} type="button" aria-label="Voltar" onClick={handleBack}>
          <ArrowLeft size={19} />
        </button>
        <div>
          <small>{fair.label}</small>
          <h1>Produto</h1>
        </div>
        <button
          className={item.purchased ? "product-check active" : "product-check"}
          type="button"
          onClick={() => {
            triggerHaptic("success");
            void togglePurchased(item.id);
          }}
        >
          {item.purchased ? <Check size={15} /> : <Circle size={15} />}
          Comprado
        </button>
      </header>

      <label className={item.imageUrl ? "product-image filled" : "product-image"}>
        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <ImagePlus size={28} />}
        <span>{item.imageUrl ? "Trocar imagem" : "Adicionar imagem"}</span>
        <input accept="image/*" type="file" onChange={handleImageChange} />
      </label>

      <div className="product-form">
        <label className="product-field large">
          <span>Nome</span>
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>

        <div className="product-field-grid">
          <label className="product-field">
            <span>Preco</span>
            <input inputMode="decimal" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} />
          </label>
          <label className="product-field">
            <span>Qtd.</span>
            <span className="qty-stepper">
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, quantity: String(Math.max(1, Number(current.quantity || 1) - 1)) }))}
              >
                <Minus size={14} />
              </button>
              <input inputMode="numeric" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} />
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, quantity: String(Number(current.quantity || 0) + 1) }))}
              >
                <Plus size={14} />
              </button>
            </span>
          </label>
        </div>

        <label className="product-field">
          <span>
            <Tag size={14} />
            Categoria
          </span>
          <select value={draft.category || "Outros"} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="product-field">
          <span>
            <StickyNote size={14} />
            Observações
          </span>
          <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>

      <div className="product-actions">
        <button className="product-save" type="button" onClick={() => void saveProduct()}>
          <Check size={17} />
          Salvar
        </button>
        <button
          className="product-delete"
          type="button"
          onClick={() => {
            if (window.confirm("Excluir este item?")) {
              triggerHaptic("light");
              void deleteItem(item.id).then(onBack);
            }
          }}
        >
          <Trash2 size={17} />
          Excluir
        </button>
      </div>
    </section>
  );
}

function StockPage({ consumeItem, error, items, restoreItem, status }: StockPageProps) {
  const [filter, setFilter] = useState<"in_stock" | "consumed">("in_stock");
  const inStockItems = items.filter((item) => item.status === "in_stock");
  const consumedItems = items.filter((item) => item.status === "consumed");
  const visibleItems = filter === "in_stock" ? inStockItems : consumedItems;
  const totalInStock = inStockItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <section className="stock-page" aria-label="Estoque">
      <header className="stock-header">
        <div>
          <small>Produtos comprados</small>
          <h1>Estoque</h1>
        </div>
        <div className="stock-total">
          <small>Total em estoque</small>
          <strong>{formatCurrency(totalInStock)}</strong>
        </div>
      </header>

      <div className="stock-tabs" role="tablist" aria-label="Status do estoque">
        <button
          className={filter === "in_stock" ? "active" : ""}
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setFilter("in_stock");
          }}
        >
          Em estoque
          <span>{inStockItems.length}</span>
        </button>
        <button
          className={filter === "consumed" ? "active" : ""}
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setFilter("consumed");
          }}
        >
          Consumidos
          <span>{consumedItems.length}</span>
        </button>
      </div>

      <div className="stock-list">
        {status === "loading" ? <p className="inline-state">Carregando estoque...</p> : null}
        {status === "error" ? <p className="inline-state error">{error}</p> : null}
        {status !== "loading" && visibleItems.length === 0 ? (
          <div className="stock-empty">
            <Store size={24} />
            <strong>{filter === "in_stock" ? "Nada em estoque ainda" : "Nenhum consumido ainda"}</strong>
            <span>{filter === "in_stock" ? "Marque itens da feira como comprados para aparecerem aqui." : "Itens consumidos ficam preservados aqui."}</span>
          </div>
        ) : null}
        {visibleItems.map((item) => (
          <StockRow consumeItem={consumeItem} item={item} key={item.id} restoreItem={restoreItem} />
        ))}
      </div>
    </section>
  );
}

function StockRow({ consumeItem, item, restoreItem }: { consumeItem: (stockItemId: string) => Promise<void>; item: StockItem; restoreItem: (stockItemId: string) => Promise<void> }) {
  const color = getCategoryColor(item.category || item.name, 0);
  const category = getCategoryMeta(item.category || item.name)?.label ?? (item.category || "Outros");

  return (
    <article className={item.status === "consumed" ? "stock-row consumed" : "stock-row"} style={{ "--stock-category-color": color } as CSSProperties}>
      <span className="stock-category-dot" aria-hidden="true" />
      <div className="stock-row-main">
        <strong>{item.name}</strong>
        <span>
          {category}
          {item.sourceFairName ? ` · ${item.sourceFairName}` : ""}
        </span>
      </div>
      <div className="stock-row-meta">
        <strong>
          {formatQuantity(item.quantity)} {item.unit}
        </strong>
        <span>{formatCurrency(item.totalPrice)}</span>
      </div>
      <button
        className={item.status === "consumed" ? "stock-action restore" : "stock-action"}
        type="button"
        onClick={() => {
          triggerHaptic(item.status === "consumed" ? "selection" : "warning");
          void (item.status === "consumed" ? restoreItem(item.id) : consumeItem(item.id));
        }}
      >
        {item.status === "consumed" ? "Voltar" : "Consumir"}
      </button>
    </article>
  );
}

type ProfileField = "name" | "email" | "birthDate";

function ProfilePage({ user, fairsCount, itemsCount, logout, theme, toggleTheme, updateProfile }: ProfilePageProps) {
  const [copied, setCopied] = useState(false);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || "Perfil Balaio";
  const firstName = user?.firstName || fullName.split(" ")[0] || "Perfil";
  const lastName = user?.lastName || fullName.split(" ").slice(1).join(" ") || "Balaio";
  const birthDate = user?.birthDate ?? "";
  const birthday = formatDate(birthDate);
  const initials = getInitials(firstName, lastName);
  const profileCode = getProfileCode(user?.id ?? "");
  const [editingField, setEditingField] = useState<ProfileField | null>(null);
  const [draft, setDraft] = useState({
    name: fullName,
    email: user?.email ?? "",
    birthDate
  });
  const [editError, setEditError] = useState("");
  const [savingField, setSavingField] = useState<ProfileField | null>(null);

  const startEdit = (field: ProfileField) => {
    triggerHaptic("selection");
    setEditError("");
    setDraft({
      name: fullName,
      email: user?.email ?? "",
      birthDate
    });
    setEditingField(field);
  };

  const cancelEdit = () => {
    triggerHaptic("light");
    setEditError("");
    setEditingField(null);
    setDraft({
      name: fullName,
      email: user?.email ?? "",
      birthDate
    });
  };

  const saveEdit = async (field: ProfileField) => {
    const next = {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      birthDate: user?.birthDate ?? "",
      email: user?.email ?? ""
    };

    if (field === "name") {
      const parts = draft.name.trim().split(/\s+/).filter(Boolean);

      if (parts.length < 2) {
        setEditError("Informe nome e sobrenome.");
        return;
      }

      next.firstName = parts[0];
      next.lastName = parts.slice(1).join(" ");
    }

    if (field === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
        setEditError("Email invalido.");
        return;
      }

      next.email = draft.email.trim();
    }

    if (field === "birthDate") {
      if (!parseDate(draft.birthDate)) {
        setEditError("Data invalida.");
        return;
      }

      next.birthDate = draft.birthDate;
      setEditingField(null);
    }

    try {
      setSavingField(field);
      await updateProfile(next);
      triggerHaptic("success");
      setEditError("");
      setEditingField(null);
    } catch (error) {
      const fields = typeof error === "object" && error !== null && "fields" in error ? (error as { fields?: Record<string, string> }).fields : undefined;
      setEditError(fields?.firstName ?? fields?.lastName ?? fields?.email ?? fields?.birthDate ?? "Nao foi possivel salvar.");
    } finally {
      setSavingField(null);
    }
  };

  return (
    <section className="profile-page" id="perfil" aria-label="Perfil">
      <section className="profile-overview" aria-label="Resumo do perfil">
        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">
            <span>{initials}</span>
            <i>
              <img src="/assets/star.svg" alt="" aria-hidden="true" />
              <Edit3 size={13} />
            </i>
          </div>

          <div className="profile-identity">
            <h2>
              {firstName}
              <br />
              {lastName}
            </h2>
            <div className="profile-facts">
              <span>
                <strong>{itemsCount}</strong>
                <small>ITENS</small>
              </span>
              <span>
                <strong>{fairsCount}</strong>
                <small>FEIRAS</small>
              </span>
              <span>
                <strong>{birthday}</strong>
                <small>NASC.</small>
              </span>
            </div>
          </div>
        </div>

        <button
          className="profile-pass"
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            void navigator.clipboard?.writeText(profileCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          <strong>{profileCode}</strong>
          <span className={copied ? "profile-copy-label copied" : "profile-copy-label"} aria-live="polite">
            {copied ? (
              <>
                <Check size={15} />
                Copiado
              </>
            ) : (
              "Copiar"
            )}
          </span>
        </button>
      </section>

      <section className="profile-section" aria-label="Dados da conta">
        <h2>Conta</h2>
        <div className="profile-list">
          <ProfileEditableRow
            draftValue={draft.name}
            editing={editingField === "name"}
            error={editingField === "name" ? editError : ""}
            icon={<UserRound size={18} />}
            inputMode="text"
            label="Nome"
            onCancel={cancelEdit}
            onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
            onEdit={() => startEdit("name")}
            onSave={() => void saveEdit("name")}
            saving={savingField === "name"}
            value={fullName}
          />
          <ProfileEditableRow
            draftValue={draft.email}
            editing={editingField === "email"}
            error={editingField === "email" ? editError : ""}
            icon={<ShieldCheck size={18} />}
            inputMode="email"
            label="Email"
            onCancel={cancelEdit}
            onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
            onEdit={() => startEdit("email")}
            onSave={() => void saveEdit("email")}
            saving={savingField === "email"}
            value={user?.email ?? "-"}
          />
          <ProfileEditableRow
            draftValue={draft.birthDate}
            editing={editingField === "birthDate"}
            error={editingField === "birthDate" ? editError : ""}
            icon={<CalendarDays size={18} />}
            inputMode="date"
            label="Nascimento"
            onCancel={cancelEdit}
            onChange={(value) => setDraft((current) => ({ ...current, birthDate: value }))}
            onEdit={() => startEdit("birthDate")}
            onSave={() => void saveEdit("birthDate")}
            saving={savingField === "birthDate"}
            value={birthday}
          />
        </div>
      </section>

      <section className="profile-section" aria-label="Preferencias">
        <h2>Preferências</h2>
        <div className="profile-list">
          <button
            className="profile-row profile-row-button"
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              toggleTheme();
            }}
          >
            <span className="profile-row-icon">{theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}</span>
            <span>
              <small>Tema</small>
              <strong>{theme === "dark" ? "Escuro" : "Claro"}</strong>
            </span>
            <ChevronRight size={18} />
          </button>
          <ProfileRow label="Haptics" value="Ativo" icon={<CheckCircle2 size={18} />} />
        </div>
      </section>

      <button
        className="profile-logout"
        type="button"
        onClick={() => {
          triggerHaptic("light");
          void logout();
        }}
      >
        <LogOut size={18} />
        Sair da conta
      </button>
    </section>
  );
}

type ProfileRowProps = {
  label: string;
  value: string;
  icon: ReactNode;
};

type ProfileEditableRowProps = ProfileRowProps & {
  draftValue: string;
  editing: boolean;
  error: string;
  inputMode: "text" | "email" | "date";
  onCancel: () => void;
  onChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  saving: boolean;
};

function ProfileEditableRow({
  draftValue,
  editing,
  error,
  icon,
  inputMode,
  label,
  onCancel,
  onChange,
  onEdit,
  onSave,
  saving,
  value
}: ProfileEditableRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }

    inputRef.current?.focus();

    if (inputMode !== "date") {
      return;
    }

    const pickerFrame = window.requestAnimationFrame(() => {
      try {
        inputRef.current?.showPicker?.();
      } catch {
        inputRef.current?.click();
      }
    });

    return () => window.cancelAnimationFrame(pickerFrame);
  }, [editing, inputMode]);

  if (!editing) {
    return (
      <button className="profile-row profile-row-button" type="button" onClick={onEdit}>
        <span className="profile-row-icon">{icon}</span>
        <span>
          <small>{label}</small>
          <strong>{value}</strong>
        </span>
        <Edit3 size={16} />
      </button>
    );
  }

  return (
    <div className="profile-row profile-row-editing">
      <span className="profile-row-icon">{icon}</span>
      <label className="profile-edit-field">
        <small>{label}</small>
        <input
          autoFocus
          className="profile-edit-input"
          disabled={saving}
          ref={inputRef}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          type={inputMode}
          value={draftValue}
        />
      </label>
      <span className="profile-edit-actions">
        <button aria-label={`Salvar ${label}`} className="icon-button compact" disabled={saving} type="button" onClick={onSave}>
          <Check size={15} />
        </button>
        <button aria-label={`Cancelar ${label}`} className="icon-button compact" disabled={saving} type="button" onClick={onCancel}>
          <X size={15} />
        </button>
      </span>
      {error ? <em className="profile-edit-error">{error}</em> : null}
    </div>
  );
}

function ProfileRow({ label, value, icon }: ProfileRowProps) {
  return (
    <div className="profile-row">
      <span className="profile-row-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

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
    <svg className="trend-chart" viewBox="0 0 160 56" role="img" aria-label="Evolução de gastos">
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

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2
  }).format(value);
}

function parseMoneyInput(value: string) {
  const clean = value.replace(/[^\d,.-]/g, "").trim();
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(parsed.toFixed(2));
}

function parseQuantityInput(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, parsed);
}

function getNextFairDate(current?: Pick<Fair, "month" | "year">) {
  if (!current) {
    const date = new Date();
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  }

  if (current.month === 12) {
    return { month: 1, year: current.year + 1 };
  }

  return { month: current.month + 1, year: current.year };
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  const date = parseDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "BL";
}

function getProfileCode(id: string) {
  const clean = id.replaceAll("-", "").toUpperCase();

  if (clean.length < 8) {
    return "BL-0000";
  }

  return `BL-${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

export default App;
