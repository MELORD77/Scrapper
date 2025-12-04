export interface AdItem {
    id: string;
    title: string;
    price: string;
    location: string;
    link: string;
    image: string;
    createdAt?: string;
  }
  
  export interface WatchList {
    users: {
      [userId: string]: string[];
    };
    lastAds: {
      [category: string]: AdItem[];
    };
  }