import { expect } from 'chai';
import 'mocha';

const ZERO = BigInt(0)

const RAND_NEG_INT_8_1 = BigInt(-45)
const RAND_NEG_INT_8_2 = BigInt(-117)
const RAND_NEG_INT_8_3 = BigInt(-1)
const RAND_NEG_INT_8_4 = BigInt(-19)

const RAND_NEG_INT_8_1_BYTES = new Uint8Array([211, 255,255,255])
const RAND_NEG_INT_8_2_BYTES = new Uint8Array([139, 255,255,255])
const RAND_NEG_INT_8_3_BYTES = new Uint8Array([255, 255,255,255])
const RAND_NEG_INT_8_4_BYTES = new Uint8Array([237, 255,255,255])

const RAND_POS_INT_8_1 = BigInt(1)
const RAND_POS_INT_8_2 = BigInt(21)
const RAND_POS_INT_8_3 = BigInt(79)
const RAND_POS_INT_8_4 = BigInt(120)

const RAND_POS_INT_8_1_BYTES = new Uint8Array([1,0,0,0])
const RAND_POS_INT_8_2_BYTES = new Uint8Array([21,0,0,0])
const RAND_POS_INT_8_3_BYTES = new Uint8Array([79,0,0,0])
const RAND_POS_INT_8_4_BYTES = new Uint8Array([120,0,0,0])

const RAND_NEG_INT_16_1 = BigInt(-10_032)
const RAND_NEG_INT_16_2 = BigInt(-549)
const RAND_NEG_INT_16_3 = BigInt(-3_921)
const RAND_NEG_INT_16_4 = BigInt(-29_301)

const RAND_NEG_INT_16_1_BYTES = new Uint8Array([208, 216, 255, 255])
const RAND_NEG_INT_16_2_BYTES = new Uint8Array([219, 253, 255, 255])
const RAND_NEG_INT_16_3_BYTES = new Uint8Array([175, 240, 255, 255])
const RAND_NEG_INT_16_4_BYTES = new Uint8Array([139, 141, 255, 255])

const RAND_POS_INT_16_1 = BigInt(9_853)
const RAND_POS_INT_16_2 = BigInt(128)
const RAND_POS_INT_16_3 = BigInt(32_103)
const RAND_POS_INT_16_4 = BigInt(4_120)

const RAND_POS_INT_16_1_BYTES = new Uint8Array([125 ,38 ,0, 0])
const RAND_POS_INT_16_2_BYTES = new Uint8Array([128 ,0, 0, 0])
const RAND_POS_INT_16_3_BYTES = new Uint8Array([103, 125, 0, 0])
const RAND_POS_INT_16_4_BYTES = new Uint8Array([24, 16, 0, 0])

const RAND_NEG_INT_32_1 = BigInt(-32_769)
const RAND_NEG_INT_32_2 = BigInt(-1_349_003)
const RAND_NEG_INT_32_3 = BigInt(-123_456_789)
const RAND_NEG_INT_32_4 = BigInt(-2_047_483_648)

const RAND_NEG_INT_32_1_BYTES = new Uint8Array([255, 127, 255, 255])
const RAND_NEG_INT_32_2_BYTES = new Uint8Array([117, 106, 235, 255])
const RAND_NEG_INT_32_3_BYTES = new Uint8Array([235, 50, 164, 248])
const RAND_NEG_INT_32_4_BYTES = new Uint8Array([0, 225, 245, 133])

const RAND_POS_INT_32_1 = BigInt(96_003)
const RAND_POS_INT_32_2 = BigInt(933_312_343)
const RAND_POS_INT_32_3 = BigInt(7_999_999)
const RAND_POS_INT_32_4 = BigInt(12_000_000)

const RAND_POS_INT_32_1_BYTES = new Uint8Array([3, 119, 1, 0])
const RAND_POS_INT_32_2_BYTES = new Uint8Array([87, 55, 161, 55])
const RAND_POS_INT_32_3_BYTES = new Uint8Array([255, 17, 122, 0])
const RAND_POS_INT_32_4_BYTES = new Uint8Array([0, 27, 183, 0])

const RAND_NEG_INT_64_1 = BigInt(-2_147_483_649)
const RAND_NEG_INT_64_2 = BigInt(-5_036_854_775_808)
const RAND_NEG_INT_64_3 = BigInt(-9_223_372_036_854_775_808)
const RAND_NEG_INT_64_4 = BigInt(-223_854_775_808)

const RAND_NEG_INT_64_1_BYTES = new Uint8Array([255,255 ,255, 127, 255, 255, 255, 255])
const RAND_NEG_INT_64_2_BYTES = new Uint8Array([0, 112, 15, 68 ,107, 251, 255, 255])
const RAND_NEG_INT_64_3_BYTES = new Uint8Array([0, 0, 0 ,0 ,0, 0, 0 ,128])
const RAND_NEG_INT_64_4_BYTES = new Uint8Array([0, 50 ,55 ,225, 203, 255 ,255 ,255])

const RAND_POS_INT_64_1 = BigInt(4_294_967_297)
const RAND_POS_INT_64_2 = BigInt(9_036_854_775_807)
const RAND_POS_INT_64_3 = BigInt(9_372_036_854_775_807)
const RAND_POS_INT_64_4 = BigInt(9_000_000_000_000)

const RAND_POS_INT_64_1_BYTES = new Uint8Array([1, 0, 0, 0, 1, 0, 0, 0])
const RAND_POS_INT_64_2_BYTES = new Uint8Array([255, 207, 132, 14, 56, 8, 0, 0])
const RAND_POS_INT_64_3_BYTES = new Uint8Array([255, 255, 140, 95, 209, 75, 33, 0])
const RAND_POS_INT_64_4_BYTES = new Uint8Array([0 ,144, 205, 121, 47, 8, 0, 0])

const MIN_INT_8 = BigInt(-128)
const MIN_INT_16 = BigInt(-32_768)
const MIN_INT_32 = BigInt(-2_147_483_648)
const MIN_INT_64 = BigInt(-9_223_372_036_854_775_808)

const MIN_INT_8_BYTES = new Uint8Array([128, 255, 255, 255])
const MIN_INT_16_BYTES = new Uint8Array([0, 128, 255, 255])
const MIN_INT_32_BYTES = new Uint8Array([0, 0, 0 ,128])
const MIN_INT_64_BYTES = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 128])

const MAX_INT_8 = BigInt(127)
const MAX_INT_16 = BigInt(32_767)
const MAX_INT_32 = BigInt(2_147_483_647)
const MAX_INT_64 = BigInt(9_223_372_036_854_775_807)

const MAX_INT_8_BYTES = new Uint8Array([127, 0, 0 ,0])
const MAX_INT_16_BYTES = new Uint8Array([255 ,127, 0, 0])
const MAX_INT_32_BYTES = new Uint8Array([255 ,255 ,255, 127])
const MAX_INT_64_BYTES = new Uint8Array([255 ,255, 255, 255, 255, 255, 255, 127])

const MAX_UINT_8 = BigInt(256)
const MAX_UINT_16 = BigInt(65_536)
const MAX_UINT_32 = BigInt(4_294_967_296)

const MAX_UINT_8_BYTES = new Uint8Array([0, 1, 0 ,0])
const MAX_UINT_16_BYTES = new Uint8Array([0,0, 1, 0])
const MAX_UINT_32_BYTES = new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0])

describe('Testing toPlain (Model/Collection)', () => {

    it('output should be equal with initialState (Model) 1/2', () => {
        // expect(User.to().string()).to.equal(JSON.stringify(USER_DATA));
      });


})