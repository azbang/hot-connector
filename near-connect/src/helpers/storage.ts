export interface DataStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorage implements DataStorage {
  async get(key: string) {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }

  async set(key: string, value: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  }

  async remove(key: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }
}
