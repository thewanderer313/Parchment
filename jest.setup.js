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

// react-native-reanimated's full animation runtime requires native Worklets
// which don't load in Jest. This hand-crafted mock replaces shared values
// and animated styles with synchronous no-op equivalents so unit tests can
// render Reanimated components without a native runtime.
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Text, Image, ScrollView } = require("react-native");

  const useSharedValue = (init) => {
    const ref = { value: init };
    return new Proxy(ref, {
      get(t, p) { return t[p]; },
      set(t, p, v) { t[p] = v; return true; },
    });
  };
  const useAnimatedStyle = (fn) => { try { return fn(); } catch { return {}; } };
  const withTiming = (value, _opts, cb) => { if (cb) cb(true); return value; };
  const withSpring = (value, _opts, cb) => { if (cb) cb(true); return value; };
  const withDecay = (value) => value;
  const withDelay = (_delay, anim) => anim;
  const withRepeat = (anim) => anim;
  const withSequence = (...anims) => anims[anims.length - 1];
  const interpolate = (value, input, output) => {
    const idx = input.findIndex((v) => value <= v);
    if (idx <= 0) return output[0];
    if (idx >= input.length) return output[output.length - 1];
    const t = (value - input[idx - 1]) / (input[idx] - input[idx - 1]);
    return output[idx - 1] + t * (output[idx] - output[idx - 1]);
  };
  const Easing = {
    linear: (t) => t, ease: (t) => t, quad: (t) => t, cubic: (t) => t,
    in: (e) => e, out: (e) => e, inOut: (e) => e, bezier: () => (t) => t,
  };
  const runOnJS = (fn) => fn;
  const runOnUI = (fn) => fn;
  const cancelAnimation = () => {};
  const useAnimatedRef = () => ({ current: null });
  const useAnimatedScrollHandler = () => () => {};
  const useAnimatedGestureHandler = (handlers) => handlers;
  const useAnimatedReaction = () => {};
  const useDerivedValue = (fn) => useSharedValue(fn());
  const useAnimatedProps = (fn) => fn();
  const useScrollViewOffset = () => useSharedValue(0);
  const useEvent = () => () => {};

  const AnimatedView = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
  const AnimatedText = React.forwardRef((props, ref) => React.createElement(Text, { ...props, ref }));
  const AnimatedImage = React.forwardRef((props, ref) => React.createElement(Image, { ...props, ref }));
  const AnimatedScrollView = React.forwardRef((props, ref) => React.createElement(ScrollView, { ...props, ref }));

  const Animated = {
    View: AnimatedView, Text: AnimatedText, Image: AnimatedImage, ScrollView: AnimatedScrollView,
    createAnimatedComponent: (C) => C,
    FlatList: (props) => React.createElement(View, props),
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue, useAnimatedStyle, useAnimatedRef,
    useAnimatedScrollHandler, useAnimatedGestureHandler, useAnimatedReaction,
    useDerivedValue, useAnimatedProps, useScrollViewOffset, useEvent,
    withTiming, withSpring, withDecay, withDelay, withRepeat, withSequence,
    interpolate, Easing, runOnJS, runOnUI, cancelAnimation,
    Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
    ...Animated,
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
