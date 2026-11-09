import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyAdminPin } from '../api';

export default function AdminPinModal({ visible, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!pin.trim()) {
      setError('Введите код доступа');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyAdminPin(pin);
      setPin('');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Неверный код доступа (по умолчанию: 1234)');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={24} color="#38bdf8" />
          </View>

          <Text style={styles.title}>Консоль диспетчера</Text>
          <Text style={styles.subtitle}>Введите PIN-код для входа в панель управления инцидентами</Text>

          <TextInput
            style={[styles.pinInput, error ? styles.pinInputError : null]}
            value={pin}
            onChangeText={(txt) => {
              setPin(txt);
              setError('');
            }}
            keyboardType="numeric"
            secureTextEntry={true}
            maxLength={8}
            placeholder="••••"
            placeholderTextColor="#475569"
            autoFocus={true}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.hint}>Стандартный доступ: 1234</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmBtnText}>Войти</Text>
              )}
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
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 16,
  },
  pinInput: {
    width: 170,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '700',
    color: '#f8fafc',
    backgroundColor: '#090d16',
    marginBottom: 8,
  },
  pinInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
