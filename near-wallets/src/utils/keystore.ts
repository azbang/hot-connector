import { KeyPair } from "@near-js/crypto";
import { KeyStore } from "@near-js/keystores";

export class SelectorStorageKeyStore extends KeyStore {
  readonly storage = window.selector.storage;
  readonly prefix = "near-api-js:keystore:";

  async setKey(networkId: string, accountId: string, keyPair: KeyPair): Promise<void> {
    await this.storage.set(this.storageKeyForSecretKey(networkId, accountId), keyPair.toString());
  }

  async getKey(networkId: string, accountId: string): Promise<any> {
    const value = await this.storage.get(this.storageKeyForSecretKey(networkId, accountId)).catch(() => null);
    if (!value) return null;
    return KeyPair.fromString(value as any);
  }

  async removeKey(networkId: string, accountId: string): Promise<void> {
    await this.storage.remove(this.storageKeyForSecretKey(networkId, accountId));
  }

  async clear(): Promise<void> {
    for await (const key of this.storageKeys()) {
      if (key.startsWith(this.prefix)) {
        await this.storage.remove(key);
      }
    }
  }

  async getNetworks(): Promise<string[]> {
    const result = new Set<string>();
    for await (const key of this.storageKeys()) {
      if (key.startsWith(this.prefix)) {
        const parts = key.substring(this.prefix.length).split(":");
        result.add(parts[1]);
      }
    }

    return Array.from(result.values());
  }

  async getAccounts(networkId: string): Promise<string[]> {
    const result = new Array<string>();
    for await (const key of this.storageKeys()) {
      if (!key.startsWith(this.prefix)) continue;
      const parts = key.substring(this.prefix.length).split(":");
      if (parts[1] === networkId) result.push(parts[0]);
    }

    return result;
  }

  private storageKeyForSecretKey(networkId: string, accountId: string): string {
    return `${this.prefix}${accountId}:${networkId}`;
  }

  private async *storageKeys(): AsyncIterableIterator<string> {
    const keys = await this.storage.keys();
    for (const key of keys) {
      yield key;
    }
  }
}
