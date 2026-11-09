import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTickets, getImageUrl } from '../api';

const STATUS_MAP = {
  new: { label: 'Новая', color: '#0284c7', bg: '#e0f2fe', icon: 'sparkles' },
  in_progress: { label: 'В работе', color: '#d97706', bg: '#fef3c7', icon: 'construct' },
  resolved: { label: 'Выполнено', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  rejected: { label: 'Отклонено', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
};

export default function MyTicketsScreen({ onSelectPhoto, onCreateNew }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const data = await fetchTickets();
      setTickets(data);
    } catch (err) {
      setError('Не удалось загрузить заявки. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderTicketItem = ({ item }) => {
    const statusMeta = STATUS_MAP[item.status] || STATUS_MAP.new;
    const formattedDate = item.created_at
      ? new Date(item.created_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.idRow}>
            <Text style={styles.ticketId}>#{item.id}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={13} color={statusMeta.color} />
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#0284c7" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category || 'Общее'}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.priority || 'Обычный'}</Text>
          </View>
        </View>

        {item.images && item.images.length > 0 && (
          <View style={styles.photosRow}>
            {item.images.map((img, i) => {
              const fullUrl = getImageUrl(img.file_path);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => onSelectPhoto && onSelectPhoto(fullUrl)}
                >
                  <Image source={{ uri: fullUrl }} style={styles.thumbImage} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {item.admin_notes ? (
          <View style={styles.adminNoteBox}>
            <View style={styles.adminNoteHeader}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#0284c7" />
              <Text style={styles.adminNoteTitle}>Ответ сисадмина:</Text>
            </View>
            <Text style={styles.adminNoteText}>{item.admin_notes}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Загрузка заявок...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={20} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTicketItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Заявок пока нет</Text>
            <Text style={styles.emptySubtitle}>
              Если что-то сломалось или нужна помощь сисадмина — создайте первую заявку!
            </Text>
            {onCreateNew && (
              <TouchableOpacity style={styles.createBtn} onPress={onCreateNew}>
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.createBtnText}>Создать заявку</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  adminNoteBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  adminNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  adminNoteText: {
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
});
