export class Queue {
  _items: any[] = [];
  enqueue(item: any) {
    this._items.push(item);
  }

  dequeue() {
    return this._items.shift();
  }

  get size() {
    return this._items.length;
  }
}

export class AutoQueue extends Queue {
  _pendingPromise = false;
  enqueue<T>(action: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      super.enqueue({ action, resolve, reject });
      this.dequeue();
    });
  }

  async dequeue() {
    if (this._pendingPromise) return false;
    const item = super.dequeue();
    if (!item) return false;

    try {
      this._pendingPromise = true;
      const payload = await item.action(this);
      this._pendingPromise = false;
      item.resolve(payload);
    } catch (e) {
      this._pendingPromise = false;
      item.reject(e);
    } finally {
      void this.dequeue();
    }

    return true;
  }
}
