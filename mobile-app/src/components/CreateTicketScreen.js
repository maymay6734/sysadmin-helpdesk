import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { createTicket } from '../api';

const CATEGORIES = [
  { id: 'Оборудование (ПК, ноутбук)', icon: 'desktop-outline' },
  { id: 'Периферия (принтер, сканер)', icon: 'print-outline' },
  { id: 'Сетевая инфраструктура', icon: 'git-network-outline' },
  { id: 'Программное обеспечение', icon: 'terminal-outline' },
  { id: 'Учетные записи и доступы', icon: 'key-outline' },
  { id: 'Прочее', icon: 'cube-outline' },
];

const PRIORITIES = [
  { id: 'Низкий', dot: '#94a3b8', bg: '#161e2e', border: '#222f43' },
  { id: 'Средний', dot: '#38bdf8', bg: '#082f49', border: '#0284c7' },
  { id: 'Высокий', dot: '#f59e0b', bg: '#451a03', border: '#d97706' },
  { id: 'Критический', dot: '#ef4444', bg: '#450a0a', border: '#dc2626' },
];

export default function CreateTicketScreen({ onTicketCreated, onViewMyTickets }) {
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [priority, setPriority] = useState(PRIORITIES[1].id);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Доступ ограничен', 'Предоставьте доступ к галерее для прикрепления изображений.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        setPhotos((prev) => [...prev, ...result.assets]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось загрузить файл: ' + e.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Доступ ограничен', 'Предоставьте доступ к камере.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        setPhotos((prev) => [...prev, ...result.assets]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось запустить камеру: ' + e.message);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!location.trim()) {
      Alert.alert('Обязательное поле', 'Укажите локацию (кабинет, корпус или этаж).');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Обязательное поле', 'Подробно опишите симптомы неисправности.');
      return;
    }

    setSubmitting(true);
    try {
      const newTicket = await createTicket({
        location,
        description,
        category,
        priority,
        contactName,
        contactPhone,
        photos,
      });

      setSuccessTicketId(newTicket.id);
      setLocation('');
      setDescription('');
      setCategory(CATEGORIES[0].id);
      setPriority(PRIORITIES[1].id);
      setPhotos([]);
      if (onTicketCreated) onTicketCreated(newTicket);
    } catch (err) {
      Alert.alert('Сбой отправки', err.message || 'Не удалось отправить данные.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {successTicketId && (
        <View style={styles.successBanner}>
          <View style={styles.successRow}>
            <View style={styles.successDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>
                Инцидент зарегистрирован: INC-{String(successTicketId).padStart(4, '0')}
              </Text>
              <Text style={styles.successText}>Заявка поставлена в очередь обработки дежурному инженеру.</Text>
            </View>
          </View>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successBtnSecondary}
              onPress={() => setSuccessTicketId(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.successBtnSecondaryText}>Создать еще</Text>
            </TouchableOpacity>
            {onViewMyTickets && (
              <TouchableOpacity
                style={styles.successBtnPrimary}
                onPress={() => {
                  setSuccessTicketId(null);
                  onViewMyTickets();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successBtnPrimaryText}>К журналу заявок</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Hero card */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Регистрация инцидента</Text>
          <View style={styles.badgeSla}>
            <Text style={styles.badgeSlaText}>SLA 15m</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Оформление сервисного обращения в службу эксплуатации IT-инфраструктуры
        </Text>
      </View>

      {/* Location */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>
          Локация / Рабочее место <Text style={styles.reqStar}>*</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="Например: Корпус А, 3 этаж, каб. 312"
          placeholderTextColor="#475569"
          value={location}
          onChangeText={setLocation}
        />
      </View>

      {/* Category */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Категория инцидента</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryTile, isSelected && styles.categoryTileActive]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={isSelected ? '#38bdf8' : '#64748b'}
                />
                <Text
                  style={[
                    styles.categoryTileText,
                    isSelected && styles.categoryTileTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>
          Описание проблемы <Text style={styles.reqStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.textInput, styles.textAreaInput]}
          placeholder="Подробно изложите симптомы сбоя, поведение устройства или код ошибки..."
          placeholderTextColor="#475569"
          value={description}
          onChangeText={setDescription}
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Priority */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Приоритет</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const isSelected = priority === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.priorityBtn,
                  isSelected
                    ? { backgroundColor: p.bg, borderColor: p.border }
                    : styles.priorityBtnInactive,
                ]}
                onPress={() => setPriority(p.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.dot }]} />
                <Text
                  style={[
                    styles.priorityBtnText,
                    isSelected && { color: '#f8fafc', fontWeight: '700' },
                  ]}
                >
                  {p.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Attachments */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Фотоматериалы и вложения</Text>
        <Text style={styles.fieldHint}>
          Прикрепите фото шильдика оборудования или скриншот ошибки
        </Text>

        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={17} color="#38bdf8" />
            <Text style={styles.uploadBtnText}>Снимок с камеры</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage} activeOpacity={0.7}>
            <Ionicons name="attach-outline" size={17} color="#38bdf8" />
            <Text style={styles.uploadBtnText}>Выбрать файл</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbList}>
            {photos.map((p, idx) => (
              <View key={idx} style={styles.photoItem}>
                <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoDeleteBtn}
                  onPress={() => handleRemovePhoto(idx)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={14} color="#f8fafc" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Contact info */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Данные заявителя</Text>
        <View style={styles.contactFields}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.textInput}
              placeholder="ФИО сотрудника"
              placeholderTextColor="#475569"
              value={contactName}
              onChangeText={setContactName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.textInput}
              placeholder="Телефон / Внутренний"
              placeholderTextColor="#475569"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="send" size={16} color="#ffffff" />
            <Text style={styles.submitButtonText}>Зарегистрировать инцидент</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  headerBlock: {
    marginBottom: 16,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.4,
  },
  badgeSla: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSlaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  reqStar: {
    color: '#f87171',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 15,
  },
  textInput: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
  },
  textAreaInput: {
    height: 100,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  categoryTileActive: {
    backgroundColor: '#082f49',
    borderColor: '#0284c7',
  },
  categoryTileText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  categoryTileTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  priorityBtnInactive: {
    backgroundColor: '#090d16',
    borderColor: '#1e293b',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  photoThumbList: {
    marginTop: 12,
  },
  photoItem: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#090d16',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactFields: {
    flexDirection: 'row',
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34d399',
  },
  successText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  successActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  successBtnSecondary: {
    backgroundColor: '#111827',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  successBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  successBtnPrimary: {
    backgroundColor: '#059669',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  successBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
