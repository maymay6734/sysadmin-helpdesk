import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl, setApiUrl } from '../config';

export default function SettingsModal({ visible, onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }

  useEffect(() => {
    if (visible) {
      getApiUrl().then((val) => {
        setUrl(val);
        setTestResult(null);
      });
    }
  }, [visible]);

  const testConnection = async (targetUrl) => {
    setTesting(true);
    setTestResult(null);
    try {
      const clean = targetUrl.trim().replace(/\/+$/, '');
      const resp = await fetch(`${clean}/api/health`, { method: 'GET' });
      if (resp.ok) {
        setTestResult({ success: true, message: 'Сервер доступен! Соединение успешно.' });
      } else {
        setTestResult({ success: false, message: `Ответ сервера: статус ${resp.status}` });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Не удалось подключиться. Проверьте адрес и включен ли сервер.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Ошибка', 'Введите адрес сервера');
      return;
    }
    const saved = await setApiUrl(url);
    if (onSaved) onSaved(saved);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="settings" size={24} color="#0284c7" />
              <Text style={styles.title}>Настройки подключения</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Адрес бэкенд-сервера API:</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={(txt) => {
              setUrl(txt);
              setTestResult(null);
            }}
            placeholder="http://192.168.1.161:8000"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Для работы с телефона укажите IP-адрес вашего компьютера в локальной сети Wi-Fi (например, http://192.168.1.161:8000).
          </Text>

          {testResult && (
            <View
              style={[
                styles.resultBadge,
                testResult.success ? styles.resultSuccess : styles.resultError,
              ]}
            >
              <Ionicons
                name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={testResult.success ? '#15803d' : '#b91c1c'}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: testResult.success ? '#15803d' : '#b91c1c' },
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => testConnection(url)}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <>
                  <Ionicons name="pulse" size={18} color="#0284c7" />
                  <Text style={styles.testBtnText}>Проверить связь</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 17,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  resultSuccess: {
    backgroundColor: '#dcfce7',
  },
  resultError: {
    backgroundColor: '#fee2e2',
  },
  resultText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    gap: 6,
  },
  testBtnText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
