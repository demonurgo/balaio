import { apiGet, apiPatch } from "../lib/api";

export type StockStatus = "in_stock" | "consumed";

export type StockItemDto = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  status: StockStatus;
  sourceFairId?: string | null;
  sourceFairItemId?: string | null;
  sourceFairName?: string | null;
  consumedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getStock() {
  return apiGet<{ data: StockItemDto[] }>("/api/stock");
}

export function consumeStockItem(stockItemId: string) {
  return apiPatch<{ data: StockItemDto }>(`/api/stock/${stockItemId}/consume`, {});
}

export function restoreStockItem(stockItemId: string) {
  return apiPatch<{ data: StockItemDto }>(`/api/stock/${stockItemId}/restore`, {});
}
