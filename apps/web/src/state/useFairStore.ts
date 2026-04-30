import { create } from "zustand";

export type Fair = {
  id: string;
  label: string;
  budget: number;
  total: number;
  memberCount: number;
};

export type FairItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchased: boolean;
  category?: string;
  notes?: string;
  imageUrl?: string;
};

type FairState = {
  selectedFairId: string;
  fairs: Fair[];
  itemsByFair: Record<string, FairItem[]>;
  selectFair: (fairId: string) => void;
  togglePurchased: (itemId: string) => void;
  updateItem: (itemId: string, input: Partial<Omit<FairItem, "id" | "totalPrice">>) => void;
};

const fairs: Fair[] = [
  { id: "maio-2026", label: "Maio 2026", budget: 600, total: 432.5, memberCount: 2 },
  { id: "abril-2026", label: "Abril 2026", budget: 550, total: 548.3, memberCount: 2 },
  { id: "marco-2026", label: "Marco 2026", budget: 500, total: 362.1, memberCount: 2 },
  { id: "fevereiro-2026", label: "Fevereiro 2026", budget: 450, total: 298.4, memberCount: 2 }
];

const maioItems: FairItem[] = [
  { id: "arroz", name: "Arroz agulhinha 5kg", quantity: 2, unitPrice: 24.9, totalPrice: 49.8, purchased: true, category: "Mercearia" },
  { id: "feijao", name: "Feijao carioca 1kg", quantity: 2, unitPrice: 7.9, totalPrice: 15.8, purchased: true, category: "Mercearia" },
  { id: "acucar", name: "Acucar cristal 1kg", quantity: 2, unitPrice: 4.59, totalPrice: 9.18, purchased: true, category: "Mercearia" },
  { id: "cafe", name: "Cafe torrado 500g", quantity: 2, unitPrice: 18.9, totalPrice: 37.8, purchased: false, category: "Cafe" },
  { id: "oleo", name: "Oleo de soja 900ml", quantity: 2, unitPrice: 7.49, totalPrice: 14.98, purchased: false, category: "Cozinha" },
  { id: "leite", name: "Leite integral 1L", quantity: 4, unitPrice: 4.49, totalPrice: 17.96, purchased: false, category: "Laticinios" },
  { id: "pao", name: "Pao de forma", quantity: 2, unitPrice: 6.9, totalPrice: 13.8, purchased: false, category: "Padaria" }
];

function recalculateItem(item: FairItem): FairItem {
  const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
  const unitPrice = Math.max(0, Number(item.unitPrice) || 0);

  return {
    ...item,
    quantity,
    unitPrice,
    totalPrice: Number((quantity * unitPrice).toFixed(2))
  };
}

export const useFairStore = create<FairState>((set) => ({
  selectedFairId: "maio-2026",
  fairs,
  itemsByFair: {
    "maio-2026": maioItems,
    "abril-2026": maioItems.map((item) => ({ ...item, id: `abril-${item.id}`, purchased: true })),
    "marco-2026": maioItems.slice(0, 5).map((item) => ({ ...item, id: `marco-${item.id}` })),
    "fevereiro-2026": maioItems.slice(0, 4).map((item) => ({ ...item, id: `fevereiro-${item.id}` }))
  },
  selectFair: (fairId) => set({ selectedFairId: fairId }),
  togglePurchased: (itemId) =>
    set((state) => {
      const currentItems = state.itemsByFair[state.selectedFairId] ?? [];

      return {
        itemsByFair: {
          ...state.itemsByFair,
          [state.selectedFairId]: currentItems.map((item) =>
            item.id === itemId ? { ...item, purchased: !item.purchased } : item
          )
        }
      };
    }),
  updateItem: (itemId, input) =>
    set((state) => {
      const currentItems = state.itemsByFair[state.selectedFairId] ?? [];
      let totalDelta = 0;
      const nextItems = currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextItem = recalculateItem({ ...item, ...input });
        totalDelta = nextItem.totalPrice - item.totalPrice;
        return nextItem;
      });

      return {
        fairs: state.fairs.map((fair) =>
          fair.id === state.selectedFairId
            ? { ...fair, total: Number((fair.total + totalDelta).toFixed(2)) }
            : fair
        ),
        itemsByFair: {
          ...state.itemsByFair,
          [state.selectedFairId]: nextItems
        }
      };
    })
}));
