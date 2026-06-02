// Mock expo-crypto for Jest tests
jest.mock("expo-crypto", () => {
  const { randomUUID } = require("crypto");
  return {
    randomUUID,
  };
});
