
export type Dict<T, K extends string | number = string> = Record<K, T>;

export interface AnyObj extends Dict<any> {}

