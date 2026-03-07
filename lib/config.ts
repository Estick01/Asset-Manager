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

const getApiUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:5000';
    }
    
    if (Platform.OS === 'ios') {
      return 'http://localhost:5000';
    }
    
    if (Platform.OS === 'android') {
      return LOCAL_IP ? `http://${LOCAL_IP}:5000` : 'http://10.0.2.2:5000';
    }
    
    return LOCAL_IP ? `http://${LOCAL_IP}:5000` : 'http://localhost:5000';
  }
  
  return process.env.PRODUCTION_API_URL || 'https://your-production-api.com';
};

export const API_URL = getApiUrl();