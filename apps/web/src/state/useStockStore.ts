import { create } from "zustand";
import * as stockApi from "../stock/stockApi";
import type { StockItemDto, StockStatus } from "../stock/stockApi";

export type StockItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  notes: string;
  imageUrl: string;
  status: StockStatus;
  sourceFairId: string;
  sourceFairItemId: string;
  sourceFairName: string;
  consumedBy: string;
  consumedByName: string;
  consumedAt: string;
  createdAt: string;
  updatedAt: string;
};

type StockState = {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  items: StockItem[];
  loadStock: () => Promise<void>;
  consumeItem: (stockItemId: string) => Promise<void>;
  restoreItem: (stockItemId: string) => Promise<void>;
};

export const useStockStore = create<StockState>((set) => ({
  status: "idle",
  error: "",
  items: [],

  loadStock: async () => {
    set({ status: "loading", error: "" });

    try {
      const response = await stockApi.getStock();
      set({ status: "ready", error: "", items: response.data.map(mapStockItem) });
    } catch (error) {
      set({ status: "error", error: getErrorMessage(error) });
    }
  },

  consumeItem: async (stockItemId) => {
    const response = await stockApi.consumeStockItem(stockItemId);
    const item = mapStockItem(response.data);

    set((state) => ({
      items: state.items.map((current) => (current.id === item.id ? item : current))
    }));
  },

  restoreItem: async (stockItemId) => {
    const response = await stockApi.restoreStockItem(stockItemId);
    const item = mapStockItem(response.data);

    set((state) => ({
      items: state.items.map((current) => (current.id === item.id ? item : current))
    }));
  }
}));

function mapStockItem(item: StockItemDto): StockItem {
  return {
    ...item,
    category: item.category ?? "",
    notes: item.notes ?? "",
    imageUrl: item.imageUrl ?? "",
    sourceFairId: item.sourceFairId ?? "",
    sourceFairItemId: item.sourceFairItemId ?? "",
    sourceFairName: item.sourceFairName ?? "",
    consumedBy: item.consumedBy ?? "",
    consumedByName: item.consumedByName ?? "",
    consumedAt: item.consumedAt ?? ""
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível carregar o estoque.";
}
