import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";
import { STORAGE_KEYS } from "./keys";

function getBrowserName(): string | null {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;

  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome|crios|edg/i.test(ua)) return "Safari";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  return "Navegador";
}

function getDeviceName(): string {
  if (Platform.OS === "web") {
    return `${getBrowserName() ?? "Navegador"} web`;
  }
  if (Platform.OS === "ios") return "Dispositivo iOS";
  if (Platform.OS === "android") return "Dispositivo Android";
  return "Aplicacion";
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existing) return existing;

  const deviceId = `dev_${randomUUID()}`;
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  return deviceId;
}

export async function getDeviceHeaders(): Promise<Record<string, string>> {
  return {
    "x-device-id": await getOrCreateDeviceId(),
    "x-device-name": getDeviceName(),
    "x-device-platform": Platform.OS,
  };
}
