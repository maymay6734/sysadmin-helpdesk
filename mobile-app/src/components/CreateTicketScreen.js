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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { createTicket } from '../api';

const CATEGORIES = [
  { id: 'ПК / Ноутбук', icon: 'laptop-outline' },
  { id: 'Принтер / МФУ', icon: 'print-outline' },
  { id: 'Сеть / Wi-Fi', icon: 'wifi-outline' },
  { id: 'ПО / 1С / Почта', icon: 'apps-outline' },
  { id: 'Доступ / Пароль', icon: 'key-outline' },
  { id: 'Другое', icon: 'help-circle-outline' },
];

const PRIORITIES = [
  { id: 'Обычный', color: '#64748b', bg: '#f1f5f9' },
  { id: 'Высокий', color: '#d97706', bg: '#fef3c7' },
  { id: 'Срочно 🚨', color: '#dc2626', bg: '#fee2e2' },
];

const QUICK_LOCATIONS = ['Офис 101', 'Бухгалтерия', 'Отдел продаж', 'Склад', 'Переговорная'];

export default function CreateTicketScreen({ onTicketCreated, onViewMyTickets }) {
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [priority, setPriority] = useState(PRIORITIES[0].id);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Доступ запрещен', 'Требуется разрешение на доступ к галерее для прикрепления фото.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        setPhotos((prev) => [...prev, ...result.assets]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось открыть галерею: ' + e.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Доступ запрещен', 'Требуется разрешение на камеру, чтобы сделать фото поломки.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
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
      Alert.alert('Внимание', 'Пожалуйста, укажите локацию (кабинет, этаж или рабочее место).');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Внимание', 'Опишите проблему, с которой вы столкнулись.');
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
      // Reset form
      setLocation('');
      setDescription('');
      setCategory(CATEGORIES[0].id);
      setPriority(PRIORITIES[0].id);
      setPhotos([]);
      if (onTicketCreated) onTicketCreated(newTicket);
    } catch (err) {
      Alert.alert('Ошибка отправки', err.message || 'Не удалось отправить заявку. Проверьте сервер.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {successTicketId && (
        <View style={styles.successBanner}>
          <View style={styles.successRow}>
            <Ionicons name="checkmark-circle" size={28} color="#15803d" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.successTitle}>Заявка #{successTicketId} принята!</Text>
              <Text style={styles.successText}>Системный администратор уже уведомлен.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setSuccessTicketId(null)}
            >
              <Text style={styles.successBtnText}>Создать еще одну</Text>
            </TouchableOpacity>
            {onViewMyTickets && (
              <TouchableOpacity
                style={[styles.successBtn, { backgroundColor: '#0284c7' }]}
                onPress={() => {
                  setSuccessTicketId(null);
                  onViewMyTickets();
                }}
              >
                <Text style={[styles.successBtnText, { color: '#fff' }]}>К списку заявок</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="hardware-chip-outline" size={16} color="#0284c7" />
          <Text style={styles.heroBadgeText}>IT Helpdesk</Text>
        </View>
        <Text style={styles.heroTitle}>Заявка системному администратору</Text>
        <Text style={styles.heroSubtitle}>
          Опишите проблему, укажите кабинет и прикрепите фото — сисадмин оперативно поможет.
        </Text>
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="location" size={18} color="#0284c7" />
          <Text style={styles.label}>Где возникла проблема? *</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Например: Главный офис, 3 этаж, каб. 305"
          placeholderTextColor="#94a3b8"
          value={location}
          onChangeText={setLocation}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {QUICK_LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.quickChip, location.includes(loc) && styles.quickChipActive]}
              onPress={() => setLocation((prev) => (prev ? `${prev}, ${loc}` : loc))}
            >
              <Text
                style={[styles.quickChipText, location.includes(loc) && styles.quickChipTextActive]}
              >
                + {loc}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="grid-outline" size={18} color="#0284c7" />
          <Text style={styles.label}>Категория проблемы</Text>
        </View>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, isSelected && styles.catCardActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={20}
                  color={isSelected ? '#0284c7' : '#64748b'}
                />
                <Text style={[styles.catCardText, isSelected && styles.catCardTextActive]}>
                  {cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="chatbox-ellipses-outline" size={18} color="#0284c7" />
          <Text style={styles.label}>Описание проблемы *</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Подробно опишите, что случилось (не включается, мигает ошибка, нет интернета, зависает...)"
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Priority Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="speedometer-outline" size={18} color="#0284c7" />
          <Text style={styles.label}>Срочность</Text>
        </View>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const isSelected = priority === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.priorityBtn,
                  { backgroundColor: isSelected ? p.bg : '#f8fafc', borderColor: isSelected ? p.color : '#e2e8f0' },
                ]}
                onPress={() => setPriority(p.id)}
              >
                <Text style={[styles.priorityBtnText, { color: isSelected ? p.color : '#64748b', fontWeight: isSelected ? '700' : '500' }]}>
                  {p.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Photos Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="camera" size={18} color="#0284c7" />
          <Text style={styles.label}>Фотография поломки / экрана</Text>
        </View>
        <Text style={styles.sectionHint}>
          Фотография помогает сисадмину быстрее определить поломку и взять нужные инструменты.
        </Text>

        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={20} color="#0284c7" />
            <Text style={styles.addPhotoBtnText}>Сделать фото</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickImage}>
            <Ionicons name="images-outline" size={20} color="#0284c7" />
            <Text style={styles.addPhotoBtnText}>Из галереи</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewScroll}>
            {photos.map((p, idx) => (
              <View key={idx} style={styles.photoWrapper}>
                <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => handleRemovePhoto(idx)}
                >
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="person-outline" size={18} color="#0284c7" />
          <Text style={styles.label}>Ваши контакты для связи</Text>
        </View>
        <View style={styles.contactRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ваше имя"
            placeholderTextColor="#94a3b8"
            value={contactName}
            onChangeText={setContactName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Телефон / TG"
            placeholderTextColor="#94a3b8"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.submitBtnContent}>
            <Ionicons name="paper-plane" size={20} color="#ffffff" />
            <Text style={styles.submitBtnText}>Отправить заявку сисадмину</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 90,
  },
  chipScroll: {
    marginTop: 8,
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  quickChipText: {
    fontSize: 12,
    color: '#475569',
  },
  quickChipTextActive: {
    color: '#0284c7',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  catCardActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
  },
  catCardText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  catCardTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 13,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addPhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  addPhotoBtnText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  photoPreviewScroll: {
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
  },
  successText: {
    fontSize: 13,
    color: '#166534',
    marginTop: 2,
  },
  successBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  successBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});
