import { type FixedUint, Uint64, Uint8 } from "low-level";
import { Uint } from "low-level";
import type { AnyObj, EncodeableObj, FixedUintConstructor } from "./types.js";
import { Utils } from "./utils.js";


export abstract class DataEncoder {

    constructor(
        readonly key: string,
        readonly hashRemove = false
    ) {}

    abstract encode(v: any): Uint[] | null;
    abstract decode(v: Uint): {
        data: any,
        length: number
    } | null;

}

class ArrayEncoder extends DataEncoder {
    
    constructor(
        key: string,
        protected readonly prefixLength: number | "unlimited",
        protected readonly targetObject: EncodeableObj,
        hashRemove = false
    ) {
        super(key, hashRemove);
    }

    public encode(array: any[]) {
        const result: Uint[] = [];

        // length check implemeting later
        if (this.prefixLength === "unlimited") {
            result.push(Utils.encodeLengthForUnlimited(array.length));
        } else {
            result.push(Uint.from(array.length, this.prefixLength));
        }

        for (let item of array) {
            result.push(this.targetObject.prototype.encodeToHex.call(item, false));
        }

        return result;
    }

    public decode(arrayDataWithPrefix: Uint) {
        const final_array = [];
        let arrayCount, prefixLength;

        if (this.prefixLength === "unlimited") {
            [arrayCount, prefixLength] = Utils.decodeLengthFromUnlimited(arrayDataWithPrefix);
        } else {
            prefixLength = this.prefixLength;
            arrayCount = arrayDataWithPrefix.slice(0, prefixLength).toInt();
        }

        let arrayData = arrayDataWithPrefix.slice(prefixLength);
        let total_arrayLength = prefixLength;
            
        for (let i = 0; i < arrayCount; i++) {
            const array_item = this.targetObject.fromDecodedHex(arrayData, true) as { data: any, length: number };
            final_array.push(array_item.data);
            arrayData = arrayData.slice(array_item.length);
            total_arrayLength += array_item.length;
        }

        return {
            data: final_array,
            length: total_arrayLength
        };
    }

}

class ObjectEncoder extends DataEncoder {

    constructor(
        key: string,
        protected readonly targetObject: EncodeableObj,
        hashRemove = false
    ) {
        super(key, hashRemove);
    }

    public encode(object: AnyObj) {
        return [this.targetObject.prototype.encodeToHex.call(object, false)];
    }

    public decode(hexData: Uint) {
        return this.targetObject.fromDecodedHex(hexData, true) as { data: any, length: number };
    }
}

class BigIntEncoder extends DataEncoder {

    readonly prefixLength = 1;

    public encode(value: Uint64) {
        const hexValue = value.toShortUint();
        const hexValueLength = Uint.from(hexValue.getLen(), this.prefixLength);
        return [hexValueLength, hexValue];
    }

    public decode(hexDataWithPrefix: Uint) {
        const dataLength = hexDataWithPrefix.slice(0, this.prefixLength).toInt();
        const totalLength = this.prefixLength + dataLength;
        const hexValue = hexDataWithPrefix.slice(this.prefixLength, totalLength);
        if (hexValue.getLen() !== dataLength) return null;
        return {
            data: Uint64.create(hexValue),
            length: totalLength
        };
    }
}

class BoolEncoder extends DataEncoder {

    readonly fixedLength = 1;

    public encode(value: boolean) {
        return [value ? Uint8.from(1) : Uint8.from(0)];
    }

    public decode(hexData: Uint) {
        const hexValue = hexData.slice(0, this.fixedLength);
        if (hexValue.getLen() !== this.fixedLength) {
            return null;
        }
        return {
            data: hexValue.eq(1),
            length: this.fixedLength
        };
    }
}

class FixedUintEncoder<T extends FixedUint> extends DataEncoder {

    constructor(
        protected readonly CLS: FixedUintConstructor<T>,
        key: string,
        hashRemove = false
    ) {
        super(key, hashRemove);
    }

    public encode(v: Uint) {
        return [v];
    }

    public decode(hexData: Uint) {
        const hexValue = hexData.slice(0, this.CLS.byteLength);
        if (hexValue.getLen() !== this.CLS.byteLength) {
            return null;
        }
        return {
            data: this.CLS.create(hexValue),
            length: hexValue.getLen()
        };
    }
}


type CustomEncodeFn<T = any> = (value: T) => Uint;
type CustomDecodeFn<T = any> = (hexData: Uint) => T;

type CustomEncoderLengthArg = { type: "prefix", val: number | "unlimited"} | { type: "fixed", val: number };

class CustomEncoder<T = Uint> extends DataEncoder {

    protected readonly prefixLength?: number | "unlimited";
    protected readonly fixedLength?: number;

    constructor(key: string, length: CustomEncoderLengthArg, hashRemove?: boolean);
    constructor(key: string, length: CustomEncoderLengthArg, hashRemove: boolean, encodeFN: CustomEncodeFn<T>, decodeFN: CustomDecodeFn<T>);
    constructor(
        key: string,
        length: CustomEncoderLengthArg,
        hashRemove = false,
        protected readonly encodeFN?: CustomEncodeFn<T>,
        protected readonly decodeFN?: CustomDecodeFn<T>
    ) {
        super(key, hashRemove);

        if (length.type === "prefix") {
            this.prefixLength = length.val;
        } else if (length.type === "fixed") {
            this.fixedLength = length.val;
        }
    }

    public encode(value: T) {
        const hexValue = this.encodeFN ? this.encodeFN(value) : value as Uint;

        if (this.prefixLength) {
            if (this.prefixLength === "unlimited") {
                const hexValueLength = Utils.encodeLengthForUnlimited(hexValue.getLen());
                return [hexValueLength, hexValue];
            }

            const hexValueLength = Uint.from(hexValue.getLen(), this.prefixLength);
            return [hexValueLength, hexValue];
        } else if (this.fixedLength && hexValue.getLen() !== this.fixedLength) {
            return null;
        }

        return [hexValue];
    }

    public decode(hexData: Uint) {
        
        let hexValueLength = 0;
        let totalLength = 0;

        if (this.fixedLength) {

            hexValueLength = this.fixedLength;
            totalLength = this.fixedLength;

        } else if (this.prefixLength) {
            let prefixLength = 0;

            if (this.prefixLength === "unlimited") {
                const lengthPrefixData = Utils.decodeLengthFromUnlimited(hexData);
                hexValueLength = lengthPrefixData[0];
                prefixLength = lengthPrefixData[1];
            } else {
                prefixLength = this.prefixLength;
                hexValueLength = hexData.slice(0, this.prefixLength).toInt();
            }

            totalLength = prefixLength + hexValueLength;
            hexData = hexData.slice(prefixLength);
        }
            
        let hexValue = hexData.slice(0, 0 + hexValueLength);
        if (hexValue.getLen() !== hexValueLength) {
            return null;
        }

        const value = this.decodeFN ? this.decodeFN(hexValue) : hexValue as T;

        return {
            data: value,
            length: totalLength
        };
    }


}

function createEncoderConstructor<const T extends new (...args: any[]) => I, const I extends DataEncoder = InstanceType<T>>(CLS: T) {
    return (...args: ConstructorParameters<T>) => new CLS(...args);
}

export function BE<T extends FixedUint>(CLS: FixedUintConstructor<T>, key: string, hashRemove = false) {
    return new FixedUintEncoder(CLS, key, hashRemove);
}

/**
 * Basic Types
 */
export namespace BE {
    export const BigInt = createEncoderConstructor(BigIntEncoder);
    export const Bool = createEncoderConstructor(BoolEncoder);

    export const Array = createEncoderConstructor(ArrayEncoder);
    export const Object = createEncoderConstructor(ObjectEncoder);

    export function Custom(key: string, length: CustomEncoderLengthArg, hashRemove?: boolean): CustomEncoder<Uint>;
    export function Custom<T>(key: string, length: CustomEncoderLengthArg, hashRemove: boolean, encodeFN: CustomEncodeFn<T>, decodeFN: CustomDecodeFn<T>): CustomEncoder<T>;
    export function Custom(key: string, length: CustomEncoderLengthArg, hashRemove = false, encodeFN?: any, decodeFN?: any) {
        return new CustomEncoder<any>(key, length, hashRemove, encodeFN, decodeFN);
    };
}

/**
 * More Advanced Types
 */
export namespace BE {
    export function Str(key: string, hashRemove = false) { 
        return new CustomEncoder(
            key, { type: "prefix", val: "unlimited" },hashRemove,
            (v: string) => Uint.from(v, "utf8"),
            (v: Uint) => v.toString("utf8")
        );
    };
}

export { BE as BEncoder };

