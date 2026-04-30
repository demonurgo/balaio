import { create } from "zustand";
import * as fairApi from "../fair/fairApi";
import type { FairItemDto, FairPayload, FairPatch, FairSummaryDto, ItemPatch, ItemPayload } from "../fair/fairApi";

export type Fair = {
  id: string;
  name: string;
  label: string;
  month: number;
  year: number;
  budget: number;
  total: number;
  memberCount: number;
};

export type FairItem = {
  id: string;
  fairId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  purchased: boolean;
  category?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
};

type FairStatus = "idle" | "loading" | "ready" | "error";

type FairState = {
  status: FairStatus;
  error: string;
  selectedFairId: string;
  fairs: Fair[];
  itemsByFair: Record<string, FairItem[]>;
  loadFairs: () => Promise<void>;
  selectFair: (fairId: string) => void;
  createFair: (input: FairPayload) => Promise<Fair>;
  updateFair: (fairId: string, input: FairPatch) => Promise<void>;
  deleteFair: (fairId: string) => Promise<void>;
  createItem: (fairId: string, input: ItemPayload) => Promise<void>;
  updateItem: (itemId: string, input: ItemPatch) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  togglePurchased: (itemId: string) => Promise<void>;
};

export const useFairStore = create<FairState>((set, get) => ({
  status: "idle",
  error: "",
  selectedFairId: "",
  fairs: [],
  itemsByFair: {},

  loadFairs: async () => {
    set({ status: "loading", error: "" });

    try {
      const response = await fairApi.getFairs();
      const fairs = response.data.fairs.map(mapFair);
      const itemsByFair = mapItemsByFair(response.data.itemsByFair);
      const currentSelected = get().selectedFairId;
      const selectedFairId = fairs.some((fair) => fair.id === currentSelected) ? currentSelected : fairs[0]?.id ?? "";

      set({ fairs, itemsByFair, selectedFairId, status: "ready", error: "" });
    } catch (error) {
      set({ status: "error", error: getErrorMessage(error) });
    }
  },

  selectFair: (fairId) => set({ selectedFairId: fairId }),

  createFair: async (input) => {
    const response = await fairApi.createFair(input);
    const fair = mapFair(response.data);

    set((state) => ({
      fairs: [fair, ...state.fairs].sort(sortFairs),
      itemsByFair: { ...state.itemsByFair, [fair.id]: [] },
      selectedFairId: fair.id
    }));

    return fair;
  },

  updateFair: async (fairId, input) => {
    const response = await fairApi.updateFair(fairId, input);
    const fair = mapFair(response.data);

    set((state) => ({
      fairs: state.fairs.map((current) => (current.id === fairId ? fair : current)).sort(sortFairs)
    }));
  },

  deleteFair: async (fairId) => {
    await fairApi.deleteFair(fairId);
    set((state) => {
      const fairs = state.fairs.filter((fair) => fair.id !== fairId);
      const itemsByFair = { ...state.itemsByFair };
      delete itemsByFair[fairId];

      return {
        fairs,
        itemsByFair,
        selectedFairId: state.selectedFairId === fairId ? fairs[0]?.id ?? "" : state.selectedFairId
      };
    });
  },

  createItem: async (fairId, input) => {
    const response = await fairApi.createItem(fairId, input);
    const item = mapItem(response.data);

    set((state) => applyItems(state, fairId, [...(state.itemsByFair[fairId] ?? []), item]));
  },

  updateItem: async (itemId, input) => {
    const fairId = get().selectedFairId;

    if (!fairId) {
      return;
    }

    const response = await fairApi.updateItem(fairId, itemId, input);
    const item = mapItem(response.data);

    set((state) => applyItems(state, fairId, (state.itemsByFair[fairId] ?? []).map((current) => (current.id === item.id ? item : current))));
  },

  deleteItem: async (itemId) => {
    const fairId = get().selectedFairId;

    if (!fairId) {
      return;
    }

    await fairApi.deleteItem(fairId, itemId);
    set((state) => applyItems(state, fairId, (state.itemsByFair[fairId] ?? []).filter((item) => item.id !== itemId)));
  },

  togglePurchased: async (itemId) => {
    const state = get();
    const fairId = state.selectedFairId;
    const item = (state.itemsByFair[fairId] ?? []).find((current) => current.id === itemId);

    if (!fairId || !item) {
      return;
    }

    await state.updateItem(itemId, { purchased: !item.purchased });
  }
}));

function mapFair(fair: FairSummaryDto): Fair {
  return {
    ...fair,
    label: fair.name
  };
}

function mapItem(item: FairItemDto): FairItem {
  return {
    ...item,
    category: item.category ?? "",
    notes: item.notes ?? "",
    imageUrl: item.imageUrl ?? ""
  };
}

function mapItemsByFair(itemsByFair: Record<string, FairItemDto[]>) {
  return Object.fromEntries(Object.entries(itemsByFair).map(([fairId, items]) => [fairId, items.map(mapItem)]));
}

function applyItems(state: FairState, fairId: string, items: FairItem[]) {
  const total = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));

  return {
    itemsByFair: {
      ...state.itemsByFair,
      [fairId]: items
    },
    fairs: state.fairs.map((fair) => (fair.id === fairId ? { ...fair, total } : fair))
  };
}

function sortFairs(a: Fair, b: Fair) {
  return b.year - a.year || b.month - a.month;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Nao foi possivel carregar as feiras.";
}
