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
