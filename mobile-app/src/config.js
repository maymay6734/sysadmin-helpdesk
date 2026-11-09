import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@helpdesk_api_url';

const getInitialDefaultUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000`;
  }
  return 'http://192.168.1.161:8000';
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
  return currentApiUrl;
};

export const setApiUrl = async (url) => {
  try {
    let clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, clean);
    currentApiUrl = clean;
    return clean;
  } catch (e) {
    console.error('Error saving API URL:', e);
    return currentApiUrl;
  }
};

export const getCurrentApiUrlSync = () => currentApiUrl;
