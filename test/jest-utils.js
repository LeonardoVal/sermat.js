// eslint-disable-next-line import/prefer-default-export
export function addMatchers(expect) {
  expect.extend({
    toSerializeAs(received, text, sermat, modifiers) {
      let serialization;
      try {
        serialization = sermat.serialize(received, modifiers);
      } catch (error) {
        return {
          message: () => `serialization of ${received} failed with ${error}!`,
          pass: false,
        };
      }
      if (serialization === text) {
        return {
          message: () => `expected (${received}) not to serialize as ${JSON.stringify(text)}`,
          pass: true,
        };
      }
      return {
        message: () => `expected (${received}) to serialize as ${JSON.stringify(text)}`,
        pass: false,
      };
    },

    toMaterializeAs(received, value, sermat, modifiers) {
      let materialization;
      try {
        materialization = sermat.materialize(received, modifiers);
      } catch (error) {
        return {
          message: () => `materialization of ${received} failed with ${error}!`,
          pass: false,
        };
      }
      let pass = true;
      try {
        expect(materialization).toStrictEqual(value);
      } catch {
        pass = false;
      }
      return {
        pass,
        message: () => `expected "${received}" ${pass ? 'not' : ''} to materialize as ${value}`,
      };
    },
  });
};