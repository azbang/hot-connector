export interface DataStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorage implements DataStorage {
  async get(key: string) {
    return localStorage.getItem(key);
  }

  async set(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  async remove(key: string) {
    localStorage.removeItem(key);
  }
}
