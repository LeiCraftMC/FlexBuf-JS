import type { FixedUint, Uint } from "low-level";

export type Dict<T, K extends string | number = string> = Record<K, T>;

export interface AnyObj extends Dict<any> {}

export interface EncodeableObjInstance {
    encodeToHex(forHash: boolean): Uint;
}

export interface EncodeableObj<I extends EncodeableObjInstance = EncodeableObjInstance> {
    new(...args: any[]): I;
    prototype: I;
    fromDecodedHex(hexData: Uint, returnLength?: false): I | null;
    fromDecodedHex(hexData: Uint, returnLength: true): { data: I, length: number } | null;
    fromDecodedHex(hexData: Uint, returnLength: boolean): {
        data: I,
        length: number
    } | I | null;
}


export interface FixedUintConstructor<T extends FixedUint> {
    readonly byteLength: number;
    create: (v: Uint | Buffer) => T;
}