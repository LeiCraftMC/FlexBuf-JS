import { describe, test, expect } from "bun:test";
import { BE, Container, HashableContainer, ObjectEncoding } from "flexbuf";

describe("basic_encodings", () => {

    class Sample extends HashableContainer {

        constructor(
            
        ) {
            super();
        }

        protected static fromDict(obj: Dict<any>) {
            return new Sample(

            );
        }

    }

    test("encode_decode", () => {



    });



});