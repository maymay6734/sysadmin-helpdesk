import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@helpdesk_api_url_v2';

export const CLOUD_API_URL = 'https://sysadmin-helpdesk.onrender.com';

const getInitialDefaultUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.port === '8081') {
      return `http://${window.location.hostname}:8000`;
    }
    return window.location.origin;
  }
  return CLOUD_API_URL;
};

let currentApiUrl = getInitialDefaultUrl();

export const getApiUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved) {
      currentApiUrl = saved;
      return saved;
    }
  } catch (e) {
    console.error('Error reading saved API URL:', e);
  }
  currentApiUrl = getInitialDefaultUrl();
  return currentApiUrl;
};

export const setApiUrl = async (url) => {
  try {
    let clean = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, clean);
    currentApiUrl = clean;
    return clean;
  } catch (e) {
    console.error('Error saving API URL:', e);
    return currentApiUrl;
  }
};

export const getCurrentApiUrlSync = () => currentApiUrl;
