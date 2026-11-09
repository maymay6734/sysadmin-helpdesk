import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@helpdesk_api_url_v3';

export const CLOUD_API_URL = 'https://sysadmin-helpdesk.dastree123.workers.dev';

export const getApiUrl = async () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.port === '8081') {
      return `http://${window.location.hostname}:8000`;
    }
    return window.location.origin;
  }
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading saved API URL:', e);
  }
  return CLOUD_API_URL;
};

export const setApiUrl = async (url) => {
  try {
    let clean = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, clean);
    return clean;
  } catch (e) {
    console.error('Error saving API URL:', e);
    return CLOUD_API_URL;
  }
};

export const getCurrentApiUrlSync = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.port === '8081') {
      return `http://${window.location.hostname}:8000`;
    }
    return window.location.origin;
  }
  return CLOUD_API_URL;
};
