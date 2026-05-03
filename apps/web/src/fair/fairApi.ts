import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";

export type FairSummaryDto = {
  id: string;
  name: string;
  month: number;
  year: number;
  budget: number;
  total: number;
  memberCount: number;
};

export type FairItemDto = {
  id: string;
  fairId: string;
  name: string;
  quantity: number;
  unit: string;
  pricingMode?: "unit" | "total";
  unitPrice: number;
  totalPrice: number;
  purchased: boolean;
  category?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
};

export type FairPayload = {
  name?: string;
  month: number;
  year: number;
  budget?: number;
};

export type FairPatch = Partial<FairPayload>;

export type ItemPayload = {
  name: string;
  quantity?: number;
  unit?: string;
  pricingMode?: "unit" | "total";
  unitPrice?: number;
  purchased?: boolean;
  category?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
};

export type ItemPatch = Partial<ItemPayload>;

export type FairsResponse = {
  data: {
    fairs: FairSummaryDto[];
    itemsByFair: Record<string, FairItemDto[]>;
  };
};

export function getFairs() {
  return apiGet<FairsResponse>("/api/fairs");
}

export function createFair(values: FairPayload) {
  return apiPost<{ data: FairSummaryDto }>("/api/fairs", values);
}

export function updateFair(fairId: string, values: FairPatch) {
  return apiPatch<{ data: FairSummaryDto }>(`/api/fairs/${fairId}`, values);
}

export function deleteFair(fairId: string) {
  return apiDelete<{ ok: true }>(`/api/fairs/${fairId}`);
}

export function createItem(fairId: string, values: ItemPayload) {
  return apiPost<{ data: FairItemDto }>(`/api/fairs/${fairId}/items`, values);
}

export function updateItem(fairId: string, itemId: string, values: ItemPatch) {
  return apiPatch<{ data: FairItemDto }>(`/api/fairs/${fairId}/items/${itemId}`, values);
}

export function deleteItem(fairId: string, itemId: string) {
  return apiDelete<{ ok: true }>(`/api/fairs/${fairId}/items/${itemId}`);
}
