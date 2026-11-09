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
  const [testResult, setTestResult] = useState(null);

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
        setTestResult({ success: true, message: 'Соединение с шлюзом API успешно установлено.' });
      } else {
        setTestResult({ success: false, message: `Ответ шлюза: статус ${resp.status}` });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Не удалось связаться с сервером. Проверьте сетевой адрес.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Ошибка', 'Укажите сетевой адрес');
      return;
    }
    const saved = await setApiUrl(url);
    if (onSaved) onSaved(saved);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="pulse" size={18} color="#38bdf8" />
              <Text style={styles.title}>Сетевые параметры</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Шлюз API Service Desk</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={(txt) => {
              setUrl(txt);
              setTestResult(null);
            }}
            placeholder="https://..."
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            По умолчанию запросы направляются через защищенный облачный прокси Cloudflare.
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
                size={16}
                color={testResult.success ? '#4ade80' : '#f87171'}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: testResult.success ? '#4ade80' : '#f87171' },
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
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#38bdf8" />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={15} color="#38bdf8" />
                  <Text style={styles.testBtnText}>Проверить пинг</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Применить</Text>
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
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#f8fafc',
    backgroundColor: '#090d16',
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 15,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  resultSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  resultError: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  resultText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#161e2e',
    borderWidth: 1,
    borderColor: '#222f43',
    gap: 6,
  },
  testBtnText: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
