/**
 * Tooltip – label flotante al hacer hover (web) o long press (native).
 *
 * Uso:
 *   <Tooltip label="Eliminar proceso">
 *     <Pressable onPress={onDelete}>
 *       <Ionicons name="trash-outline" ... />
 *     </Pressable>
 *   </Tooltip>
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View, Text, Modal, StyleSheet, Pressable,
  Animated, Platform, type ViewStyle,
} from "react-native";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

interface Rect { x: number; y: number; width: number }

// useNativeDriver is not supported on web
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export function Tooltip({ label, children, style }: TooltipProps) {
  const triggerRef = useRef<View>(null);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visible,  setVisible]  = useState(false);
  const [trigger,  setTrigger]  = useState<Rect>({ x: 0, y: 0, width: 0 });
  const [bubbleW,  setBubbleW]  = useState(0);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);

    triggerRef.current?.measureInWindow((x, y, width) => {
      setTrigger({ x, y, width });
      setVisible(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 140, useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    });

    hideTimer.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 120, useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => setVisible(false));
    }, Platform.OS === "web" ? 2000 : 1800);
  }, [fadeAnim]);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 120, useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => setVisible(false));
  }, [fadeAnim]);

  const left = trigger.x + trigger.width / 2 - bubbleW / 2;
  const top  = trigger.y - 44;

  const clonedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const extraProps: Record<string, any> = {
      onLongPress: (e: any) => {
        show();
        (child as React.ReactElement<any>).props?.onLongPress?.(e);
      },
    };
    if (Platform.OS === "web") {
      extraProps.onHoverIn  = (e: any) => {
        show();
        (child as React.ReactElement<any>).props?.onHoverIn?.(e);
      };
      extraProps.onHoverOut = (e: any) => {
        hide();
        (child as React.ReactElement<any>).props?.onHoverOut?.(e);
      };
    }
    return React.cloneElement(child as React.ReactElement<any>, extraProps);
  });

  return (
    <>
      <View ref={triggerRef} style={style} collapsable={false}>
        {clonedChildren}
      </View>

      {visible && (
        Platform.OS === "web" ? (
          // Web: fixed-position bubble rendered outside any stacking context.
          // pointerEvents="none" so it never intercepts clicks.
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              { opacity: fadeAnim, position: "fixed" as any, left, top },
            ]}
            onLayout={(e) => setBubbleW(e.nativeEvent.layout.width)}
          >
            <Text style={styles.label}>{label}</Text>
            <View style={styles.arrow} />
          </Animated.View>
        ) : (
          // Native: Modal with backdrop so user can tap anywhere to dismiss.
          <Modal transparent animationType="none" statusBarTranslucent>
            <Pressable style={StyleSheet.absoluteFill} onPress={hide}>
              <Animated.View
                pointerEvents="none"
                style={[styles.bubble, { opacity: fadeAnim, left, top }]}
                onLayout={(e) => setBubbleW(e.nativeEvent.layout.width)}
              >
                <Text style={styles.label}>{label}</Text>
                <View style={styles.arrow} />
              </Animated.View>
            </Pressable>
          </Modal>
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    backgroundColor: "rgba(15,38,64,0.93)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 10,
    // Ensure it renders above everything on web
    zIndex: 9999,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
    textAlign: "center",
  },
  arrow: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    width: 9,
    height: 9,
    backgroundColor: "rgba(15,38,64,0.93)",
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
});
