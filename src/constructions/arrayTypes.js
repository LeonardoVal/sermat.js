/* eslint-disable no-new-wrappers, camelcase */
import { construction } from './common';

function serialize_TypedArray(array) {
  return [...array];
}

function materializer_TypedArray(ArrayType) {
  return function materialize_Error(_obj, args) {
    return args && new ArrayType(args.map((arg) => +arg));
  };
}

function typedArrayConstruction(ArrayType) {
  return construction({
    type: ArrayType,
    serializer: serialize_TypedArray,
    materializer: materializer_TypedArray(ArrayType),
  });
}

// export const construction_BigUint32Array = typedArrayConstruction(BigUint32Array);
// export const construction_BigUint64Array = typedArrayConstruction(BigUint64Array);

export const construction_Float32Array = typedArrayConstruction(Float32Array);
export const construction_Float64Array = typedArrayConstruction(Float64Array);
export const construction_Int16Array = typedArrayConstruction(Int16Array);
export const construction_Int32Array = typedArrayConstruction(Int32Array);
export const construction_Int8Array = typedArrayConstruction(Int8Array);
export const construction_Uint16Array = typedArrayConstruction(Uint16Array);
export const construction_Uint32Array = typedArrayConstruction(Uint32Array);
export const construction_Uint8Array = typedArrayConstruction(Uint8Array);
export const construction_Uint8ClampedArray = typedArrayConstruction(Uint8ClampedArray);
