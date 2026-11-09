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
      setError('Введите PIN-код');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyAdminPin(pin);
      setPin('');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Неверный PIN-код (по умолчанию: 1234)');
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
            <Ionicons name="shield-checkmark" size={36} color="#0284c7" />
          </View>

          <Text style={styles.title}>Вход для сисадмина</Text>
          <Text style={styles.subtitle}>Введите PIN-код для доступа к управлению заявками</Text>

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
            placeholder="****"
            placeholderTextColor="#94a3b8"
            autoFocus={true}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.hint}>Стандартный PIN: 1234</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleVerify}
              disabled={loading}
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  pinInput: {
    width: 180,
    height: 52,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  pinInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
