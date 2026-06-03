import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";

/**
 * Intercepts back-navigation while `isDirty` is true and prompts the user
 * to confirm before discarding. Returns a `skipOnce` helper the screen can
 * call right before a programmatic navigation (e.g., after a successful
 * Save) to bypass the guard for that one navigation event.
 *
 * Usage:
 *   const [dirty, setDirty] = useState(false);
 *   const { skipOnce } = useUnsavedChangesGuard(dirty);
 *   <Editor onDirtyChange={setDirty} onSubmit={async (v) => {
 *     await save(v);
 *     skipOnce();
 *     router.back();
 *   }} />
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const navigation = useNavigation();
  const allowNextLeave = useRef(false);

  useEffect(() => {
    // expo-router's useNavigation surfaces the underlying React Navigation
    // object. The beforeRemove event fires for any back / pop action.
    const sub = navigation.addListener("beforeRemove", (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (!isDirty || allowNextLeave.current) {
        allowNextLeave.current = false;
        return;
      }
      e.preventDefault();
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              allowNextLeave.current = true;
              // Replay the original navigation action the user attempted.
              (navigation as unknown as { dispatch: (a: unknown) => void }).dispatch(
                e.data.action
              );
            },
          },
        ]
      );
    });
    return sub;
  }, [navigation, isDirty]);

  return {
    skipOnce: () => {
      allowNextLeave.current = true;
    },
  };
}
