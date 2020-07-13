const succeeds = (f) => {
  try {
    f();
    return true;
  } catch {
    return false;
  }
}; 

// eslint-disable-next-line import/prefer-default-export
export function addMatchers(expect) {
  expect.extend({
    toSerializeAs(received, text, sermat, modifiers) {
      if (!sermat) {
        throw new Error('No Sermat instance given!');
      }
      let serialization;
      try {
        serialization = sermat.serialize(received, modifiers);
      } catch (error) {
        return {
          message: () => `serialization of ${received} failed with ${error}!`,
          pass: false,
        };
      }
      const pass = serialization === text;
      return {
        pass,
        message: () => `expected (${received}) ${pass ? 'not' : ''} to serialize`
          + ` as ${JSON.stringify(text)} ${pass ? '' : ` but got ${serialization}`}`,
      };
    },

    toMaterializeAs(received, value, sermat, modifiers) {
      if (!sermat) {
        throw new Error('No Sermat instance given!');
      }
      let materialization;
      try {
        materialization = sermat.materialize(received, modifiers);
      } catch (error) {
        return {
          message: () => `materialization of ${received} failed with ${error}!`,
          pass: false,
        };
      }
      const pass = succeeds(() => expect(materialization).toStrictEqual(value));
      return {
        pass,
        message: () => `expected "${received}" ${pass ? 'not' : ''} to `
          + `materialize as ${value} ${pass ? '' : ` but got ${materialization}`}`,
      };
    },
  });
};