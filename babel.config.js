// Reanimated v4 requires the react-native-worklets babel plugin to compile
// "worklet" functions (the strings at the top of Reanimated callbacks and the
// closures inside useAnimatedStyle / Gesture handlers). Without this plugin,
// worklets fail to attach to the native runtime and the app crashes silently
// when a screen mounts that uses Reanimated — Study Mode, FlipCard, and even
// expo-router's transition animations are affected.
//
// The plugin MUST be the last entry in `plugins`.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-worklets/plugin"],
  };
};
