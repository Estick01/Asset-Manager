import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getLocalIp = (): string | undefined => {
  if (process.env.EXPO_PUBLIC_LOCAL_IP) {
    return process.env.EXPO_PUBLIC_LOCAL_IP;
  }
  
  if (Constants.expoConfig?.extra?.localIp) {
    return Constants.expoConfig.extra.localIp;
  }
  
  return undefined;
};

const LOCAL_IP = getLocalIp();

// ⚠️ TUNNEL: comenta esta línea cuando no uses ngrok
// const NGROK_URL = "https://asha-unsoaked-boundlessly.ngrok-free.dev";
const NGROK_URL = undefined;


const getApiUrl = (): string => {
  if (NGROK_URL) return NGROK_URL;

  if (process.env.EXPO_PUBLIC_TUNNEL_API_URL) {
    return process.env.EXPO_PUBLIC_TUNNEL_API_URL;
  }

  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:5000';
    }
    
    if (Platform.OS === 'ios') {
      return LOCAL_IP ? `http://${LOCAL_IP}:5000` : 'http://localhost:5000';
    }
    
    if (Platform.OS === 'android') {
      return LOCAL_IP ? `http://${LOCAL_IP}:5000` : 'http://10.0.2.2:5000';
    }
    
    return LOCAL_IP ? `http://${LOCAL_IP}:5000` : 'http://localhost:5000';
  }
  
  return process.env.PRODUCTION_API_URL || 'https://your-production-api.com';
};

export const API_URL = getApiUrl();

/** true cuando el tráfico pasa por ngrok — necesita header especial */
export const IS_NGROK = !!NGROK_URL || !!process.env.EXPO_PUBLIC_TUNNEL_API_URL;