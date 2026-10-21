export interface Store<T> {
  getSnapshot: () => T;
  setState: (partial: Partial<T>) => void;
  subscribe: (listener: () => void) => () => void;
}
