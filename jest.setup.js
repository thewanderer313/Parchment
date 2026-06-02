// expo-crypto's randomUUID is backed by native bindings that don't load in Jest's
// Node environment. Delegate to Node's built-in crypto.randomUUID (which produces
// RFC4122 v4) for tests, but spread the actual module so any future expo-crypto
// export we add (digest, randomBytes, etc.) keeps working in tests too.
jest.mock("expo-crypto", () => {
  const actual = jest.requireActual("expo-crypto");
  return {
    ...actual,
    randomUUID: require("crypto").randomUUID,
  };
});

// react-native-marked depends on native rendering primitives that don't
// load in Jest. Replace it with a plain Text renderer so MarkdownText's
// own tests focus on the wrapper's behavior, not the library's internals.
jest.mock("react-native-marked", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ value }) => React.createElement(Text, null, value),
  };
});
