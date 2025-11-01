import { describe, test, expect } from "bun:test";
import { BE, Container, DataEncoder, HashableContainer } from "flexbuf";
import { Uint16, Uint256, Uint64 } from "low-level";

enum CarType {
    SEDAN = 0x00,
    SUV = 0x01,
    TRUCK = 0x02,
    COUPE = 0x03,
    CONVERTIBLE = 0x04
}

const CarTypes: CarType[] = Object.values(CarType).filter(v => typeof v === "number") as CarType[];

class CarInspectionData extends Container {
    constructor(
        readonly date: Uint64,
        readonly result: boolean
    ) {super()}

    protected static fromDict(obj: Dict<any>) {
        return new CarInspectionData(obj.date, obj.result);
    }

    protected static encodingSettings: readonly DataEncoder[] = [
        BE.BigInt("date"),
        BE.Bool("result")
    ]
}

class CarOwnerData extends Container {
    constructor(
        readonly name: string,
        readonly age: Uint16,
        readonly ownerHistory: string[]
    ) {super()}

    protected static fromDict(obj: Dict<any>) {
        return new CarOwnerData(obj.name, obj.age, obj.ownerHistory);
    }

    protected static encodingSettings: readonly DataEncoder[] = [
        BE.Str("name"),
        BE(Uint16, "age"),
        BE.CustomArray<string>(
            "ownerHistory",
            "unlimited",
            (item) => BE.Str("").encode(item),
            (hexData) =>  BE.Str("").decode(hexData)
        )
    ]
}

class CarData extends HashableContainer {
    constructor(
        readonly version: Uint16,
        readonly registrationDate: Uint64,
        readonly model: CarType,
        readonly hash: Uint256,
        readonly inspections: CarInspectionData[],
        readonly owner: CarOwnerData
    ) {super()}

    protected static fromDict(obj: Dict<any>) {
        const carData = new CarData(
            obj.version,
            obj.registrationDate,
            obj.model,
            obj.hash,
            obj.inspections,
            obj.owner
        );

        if (!carData.calculateHash().eq(carData.hash)) return null;
        return carData;
    }

    protected static encodingSettings: readonly DataEncoder[] = [
        BE(Uint16, "version"),
        BE.BigInt("registrationDate"),
        BE.Enum("model", 1, new Set(CarTypes)),
        BE(Uint256, "hash", true),
        BE.Array("inspections", "unlimited", CarInspectionData),
        BE.Object("owner", CarOwnerData)
    ]

    static createRandomCarData() {

        const randInt = (max: number) => Math.floor(Math.random() * max);
        const randBool = () => Math.random() > 0.5;
        const randStr = (length: number) => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            return Array.from({length}, () => chars.charAt(randInt(chars.length))).join("");
        }

        const car = new CarData(
            Uint16.from(randInt(65536)),
            Uint64.from(randInt(2**64)),
            randInt(5),
            Uint256.empty(),
            Array.from({length: randInt(10)},
                () => new CarInspectionData(
                    Uint64.from(randInt(2**32)),
                    randBool()
                )
            ),

            new CarOwnerData(
                randStr(randInt(100)),
                Uint16.from(randInt(65536)),
                Array.from({length: randInt(5)}, () => randStr(randInt(50)))
            )
        );

        car.hash.set(car.calculateHash());
        return car;
    }

}

describe("basic_encodings", () => {

    test("encode_decode", () => {

        const car = CarData.createRandomCarData();
        const encoded = car.encodeToHex();
        const decoded = CarData.fromDecodedHex(encoded, true);
        
        expect(decoded?.length).toBe(encoded.getLen());
        expect(JSON.stringify(decoded?.data)).toBe(JSON.stringify(car));
    });

    test("invalid_enum_value", () => {

        const car = CarData.createRandomCarData();

        //@ts-ignore
        car.model = 0xFF;

        car.hash.set(car.calculateHash());

        const encoded = car.encodeToHex();
        const decoded = CarData.fromDecodedHex(encoded, true);
        
        expect(decoded).toBeNull();
    });

});