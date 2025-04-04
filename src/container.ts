import type { Uint, Uint256 } from "low-level";
import { type DataEncoder, ObjectEncoding } from "flexbuf";
import { Utils } from "./utils";

type NewContainer<T extends Container> = new (...args: any[]) => T;

interface ContainerConstructor {
    new(...args: any[]): Container;
    fromDict<T extends Container>(obj: Dict<any>): T;
    fromDecodedHex<T extends Container>(hexData: Uint, returnLength?: false): T | null;
    fromDecodedHex<T extends Container>(this: NewContainer<T>, hexData: Uint, returnLength?: true): { data: T, length: number } | null;
    fromDecodedHex<T extends Container>(this: NewContainer<T>, hexData: Uint, returnLength?: false): T | null;
    encodingSettings: readonly DataEncoder[];
}

export abstract class Container {

    public encodeToHex(forHash = false) {
        return ObjectEncoding.encode(this, (this.constructor as typeof Container).encodingSettings, forHash).data;
    }

    static fromDecodedHex<T extends Container>(this: NewContainer<T>, hexData: Uint, returnLength?: false): T | null;
    static fromDecodedHex<T extends Container>(this: NewContainer<T>, hexData: Uint, returnLength: true): { data: T, length: number } | null;
    static fromDecodedHex<T extends Container>(this: NewContainer<T>, hexData: Uint, returnLength: boolean): T | null;
    static fromDecodedHex(hexData: Uint, returnLength = false): any {
        try {
            const result = ObjectEncoding.decode(hexData, this.encodingSettings, returnLength);
            if (result.data) {
                const obj = this.fromDict(result.data);

                if (returnLength) {
                    if (!obj) return null;
                    return { data: obj, length: result.length };
                }
                return obj;
            }
        } catch (err: any) {}
        return null;
    }

    protected static fromDict(obj: Dict<any>): Container | null {
        throw new Error("Method not implemented.");
    }

    protected static readonly encodingSettings: readonly DataEncoder[] = [];

}


export abstract class HashableContainer extends Container {
    public calculateHash() {
        return Utils.sha256(this.encodeToHex(true));
    }

    public validateHash(hash: Uint256) {
        try {
            return this.calculateHash().eq(hash);
        } catch {
            return false;
        }
    }
}

