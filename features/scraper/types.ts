export interface StoreInfo {
  address: string;
  businessHours: string;
  menus: { name: string; price: string }[];
  category: string;
  phone: string;
}

export interface StoreInfoScraper {
  scrape(url: string): Promise<StoreInfo>;
}
