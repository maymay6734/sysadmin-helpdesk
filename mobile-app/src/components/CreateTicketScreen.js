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
  { id: 'Программное обеспечение', icon: 'code-working-outline' },
  { id: 'Учетные записи и права', icon: 'key-outline' },
  { id: 'Прочее', icon: 'help-circle-outline' },
];

const PRIORITIES = [
  { id: 'Низкий', color: '#64748b', bg: '#f1f5f9' },
  { id: 'Средний', color: '#0369a1', bg: '#e0f2fe' },
  { id: 'Высокий', color: '#b45309', bg: '#fef3c7' },
  { id: 'Критический', color: '#b91c1c', bg: '#fee2e2' },
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
        Alert.alert('Доступ ограничен', 'Разрешите доступ к медиатеке для прикрепления скриншотов.');
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
      Alert.alert('Ошибка', 'Не удалось загрузить изображение: ' + e.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Доступ ограничен', 'Разрешите доступ к камере устройства.');
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
      Alert.alert('Ошибка', 'Не удалось открыть камеру: ' + e.message);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!location.trim()) {
      Alert.alert('Обязательное поле', 'Укажите точное местоположение (кабинет, корпус или отдел).');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Обязательное поле', 'Опишите характер неисправности.');
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
      Alert.alert('Ошибка отправки', err.message || 'Сбой при отправке формы. Повторите попытку.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {successTicketId && (
        <View style={styles.successBanner}>
          <View style={styles.successRow}>
            <Ionicons name="checkmark-done-circle" size={26} color="#15803d" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.successTitle}>Обращение INC-{String(successTicketId).padStart(4, '0')} зарегистрировано</Text>
              <Text style={styles.successText}>Заявка передана на рассмотрение в службу администрирования.</Text>
            </View>
          </View>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successBtnSecondary}
              onPress={() => setSuccessTicketId(null)}
            >
              <Text style={styles.successBtnSecondaryText}>Подать еще одно</Text>
            </TouchableOpacity>
            {onViewMyTickets && (
              <TouchableOpacity
                style={styles.successBtnPrimary}
                onPress={() => {
                  setSuccessTicketId(null);
                  onViewMyTickets();
                }}
              >
                <Text style={styles.successBtnPrimaryText}>Перейти к журналу</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Header card */}
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Регистрация инцидента</Text>
        <Text style={styles.headerSubtitle}>
          Оформите запрос на техническое обслуживание или устранение неисправности оборудования.
        </Text>
      </View>

      {/* Location */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Местоположение / Локация <Text style={styles.reqStar}>*</Text></Text>
        <TextInput
          style={styles.textInput}
          placeholder="Корпус, этаж, номер кабинета или название отдела"
          placeholderTextColor="#94a3b8"
          value={location}
          onChangeText={setLocation}
        />
      </View>

      {/* Category */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Категория обращения</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryTile, isSelected && styles.categoryTileActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={18}
                  color={isSelected ? '#0369a1' : '#64748b'}
                />
                <Text style={[styles.categoryTileText, isSelected && styles.categoryTileTextActive]}>
                  {cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Описание проблемы <Text style={styles.reqStar}>*</Text></Text>
        <TextInput
          style={[styles.textInput, styles.textAreaInput]}
          placeholder="Подробно изложите симптомы сбоя, код ошибки, поведение системы или характер поломки..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Priority */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Приоритет инцидента</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const isSelected = priority === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.priorityBtn,
                  {
                    backgroundColor: isSelected ? p.bg : '#ffffff',
                    borderColor: isSelected ? p.color : '#e2e8f0',
                  },
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

      {/* Photos */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Фотофиксация / Скриншоты</Text>
        <Text style={styles.fieldHint}>
          Приложите снимки экрана с ошибкой или фото оборудования для ускорения диагностики.
        </Text>

        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={18} color="#0f172a" />
            <Text style={styles.uploadBtnText}>Сделать снимок</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
            <Ionicons name="attach-outline" size={18} color="#0f172a" />
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
                >
                  <Ionicons name="close" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Requester Contact */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Контактные данные заявителя</Text>
        <View style={styles.contactFields}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.textInput}
              placeholder="ФИО сотрудника"
              placeholderTextColor="#94a3b8"
              value={contactName}
              onChangeText={setContactName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.textInput}
              placeholder="Телефон / Внутренний номер"
              placeholderTextColor="#94a3b8"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Зарегистрировать обращение</Text>
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
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  headerBlock: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reqStar: {
    color: '#dc2626',
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  categoryTileActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
  },
  categoryTileText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  categoryTileTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBtnText: {
    fontSize: 12,
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 13,
    color: '#1e293b',
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
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#0f172a',
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
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  successText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  successActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  successBtnSecondary: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  successBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  successBtnPrimary: {
    backgroundColor: '#15803d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  successBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
