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
  new: { label: 'Новое', color: '#0369a1', bg: '#e0f2fe' },
  in_progress: { label: 'В работе', color: '#b45309', bg: '#fef3c7' },
  resolved: { label: 'Решено', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Отклонено', color: '#475569', bg: '#f1f5f9' },
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
      setError('Не удалось получить список обращений. Проверьте соединение.');
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
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const incNumber = `INC-${String(item.id).padStart(4, '0')}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.idRow}>
            <Text style={styles.ticketId}>{incNumber}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={15} color="#475569" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category || 'Общее'}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.priority || 'Средний'}</Text>
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
            <Text style={styles.adminNoteTitle}>Заключение технического специалиста:</Text>
            <Text style={styles.adminNoteText}>{item.admin_notes}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#0f172a" />
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f172a']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="documents-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Обращений не зарегистрировано</Text>
            <Text style={styles.emptySubtitle}>
              В журнале пока нет активных заявок. При возникновении технических неполадок создайте новое обращение.
            </Text>
            {onCreateNew && (
              <TouchableOpacity style={styles.createBtn} onPress={onCreateNew}>
                <Text style={styles.createBtnText}>Создать обращение</Text>
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
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
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
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  adminNoteBox: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#0f172a',
    padding: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  adminNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  adminNoteText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
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
    backgroundColor: '#0f172a',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryBtnText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },
});
