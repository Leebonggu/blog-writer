import { BASE_SYSTEM_PROMPT } from "./base";
import { RESTAURANT_CATEGORY_PROMPT } from "./restaurant";
import { DELIVERY_CATEGORY_PROMPT } from "./delivery";
import { SHOP_CATEGORY_PROMPT } from "./shop";

export type CategoryId = "restaurant" | "delivery" | "shop";

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  description: string;
  categoryPrompt: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "restaurant",
    name: "맛집",
    description: "음식점 방문 리뷰",
    categoryPrompt: RESTAURANT_CATEGORY_PROMPT,
  },
  {
    id: "delivery",
    name: "배달",
    description: "배달 음식 리뷰",
    categoryPrompt: DELIVERY_CATEGORY_PROMPT,
  },
  {
    id: "shop",
    name: "소품샵",
    description: "소품샵/잡화점 방문 리뷰",
    categoryPrompt: SHOP_CATEGORY_PROMPT,
  },
];

export function getCategory(id: CategoryId): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getAllCategories(): CategoryConfig[] {
  return CATEGORIES;
}

export function buildCategorySystemPrompt(categoryId: CategoryId): string {
  const category = getCategory(categoryId);
  if (!category) throw new Error(`Unknown category: ${categoryId}`);
  return `${category.categoryPrompt}\n\n${BASE_SYSTEM_PROMPT}`;
}
