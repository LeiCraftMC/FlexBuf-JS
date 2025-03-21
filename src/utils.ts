import { Uint, Uint256 } from "low-level";
import { createHash } from "crypto";

export class Utils {

    static splitNTimes(str: string, delim: string, count: number) {
        const parts = str.split(delim);
        const tail = parts.slice(count).join(delim);
        const result = parts.slice(0,count);
        if (tail) result.push(tail);
        return result;
    }

    static encodeLengthForUnlimited(length: number) {
        const lenStr = length.toString(15) + "F";
        return Uint.from((lenStr.length % 2 === 0) ? lenStr : ("0" + lenStr));
    }

    static decodeLengthFromUnlimited(hexData: Uint) {
        const base15Length = this.splitNTimes(hexData.toHex().toUpperCase(), "F", 1)[0];
        return [
            parseInt(base15Length, 15),
            Math.ceil((base15Length.length + 1) / 2)
        ];
    }

    static sha256(input: Uint) {
        return new Uint256(
            createHash('sha256')
                .update(input.getRaw())
                .digest()
        );
    }

}


