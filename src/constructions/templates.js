/* eslint-disable no-new-wrappers, camelcase */
import { construction } from './common';

// eslint-disable-next-line import/prefer-default-export
export const construction_JSON = construction({
  type: class SerializeAsJSON {
    constructor(value) {
      this.value = value;
    }
  },
  identifier: 'JSON',
  serializer({ value }) {
    return JSON.stringify(value);
  },
  materializer(_obj, text) {
    return JSON.parse(text);
  },
});
