import { Uint } from "low-level";
import type { AnyObj } from "./types.js";
import { DataEncoder } from "./encoders.js";

export class ObjectEncoding {
    
    static encode(object: AnyObj, keyConfigs: readonly DataEncoder[], forHash: boolean): ObjectEncoding.EncodeResult {
        try {
            const hexData: Uint[] = [];

            for (const keyConfig of keyConfigs) {
                if (forHash && keyConfig.hashRemove) continue;

                const value = object[keyConfig.key]
                const rawData = keyConfig.encode(value);

                if (!rawData) {
                    return { err: new Error(`Failed to encode for key: ${keyConfig.key}`), data: Uint.empty() };
                }

                hexData.push(...rawData);
            }

            return { data: Uint.concat(hexData) };

        } catch (err: any) {
            return { err, data: Uint.empty() };
        }
    }
    
    
    static decode(hexData: Uint, keyConfigs: readonly DataEncoder[], returnLength?: false): ObjectEncoding.DecodeResult<ObjectEncoding.DecodeResult.Default>;
    static decode(hexData: Uint, keyConfigs: readonly DataEncoder[], returnLength: true): ObjectEncoding.DecodeResult<ObjectEncoding.DecodeResult.WithLength>;
    static decode(hexData: Uint, keyConfigs: readonly DataEncoder[], returnLength: boolean): ObjectEncoding.DecodeResult<ObjectEncoding.DecodeResult.Unknown>;
    static decode(hexData: Uint, keyConfigs: readonly DataEncoder[], returnLength = false) {
        try {
            const final_data: AnyObj = {};
            let current_length = 0;
        
            for (const keyConfig of keyConfigs) {
                const currentPart = hexData.slice(current_length);
                const decoded = keyConfig.decode(currentPart);

                if (!decoded) {
                    return { err: new Error(`Failed to decode for key: ${keyConfig.key}. Could be due to an Buffer underflow`) };
                }

                final_data[keyConfig.key] = decoded.data;
                current_length += decoded.length;
            }
        
            if (returnLength) {
                return { data: final_data, length: current_length };
            }

            if (hexData.getLen() !== current_length) {
                return { err: new Error("Buffer underflow or overflow") };
            }
        
            return { data: final_data };

        } catch (err: any) {
            return { err };
        }
    }

}

export namespace ObjectEncoding {
    export interface EncodeResult {
        data: Uint;
        err?: Error;
    }
    export namespace DecodeResult {
        export interface Err {
            err: Error;
            data: undefined;
            length: undefined;
        }
        export interface Default {
            data: AnyObj;
            err: undefined;
        }
        export interface WithLength extends Default {
            length: number;
        }
        export interface Unknown extends Default {
            length?: number;
        }
    }
    export type DecodeResult<T> = T | DecodeResult.Err;
}
