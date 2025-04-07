import type { FixedUint, Uint } from "low-level";

export type Dict<T, K extends string | number = string> = Record<K, T>;

export interface AnyObj extends Dict<any> {}

export interface EncodeableObjInstance {
    encodeToHex(forHash: boolean): Uint;
}

export interface EncodeableObj {
    new(...args: any[]): EncodeableObjInstance;
    prototype: EncodeableObjInstance;
    fromDecodedHex(hexData: Uint, returnLength: boolean): { data: EncodeableObjInstance, length: number } | EncodeableObjInstance | null;
}


export interface FixedUintConstructor<T extends FixedUint> {
    readonly byteLength: number;
    create: (v: Uint | Buffer) => T;
}