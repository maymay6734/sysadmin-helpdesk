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
  new: { label: 'Ожидает', dot: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.25)' },
  in_progress: { label: 'В работе', dot: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
  resolved: { label: 'Закрыт', dot: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  rejected: { label: 'Отклонен', dot: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' },
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
      setError('Не удалось загрузить реестр инцидентов.');
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
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={[styles.statusBadgeText, { color: statusMeta.dot }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#38bdf8" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category || 'Общее'}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Приоритет: {item.priority || 'Средний'}</Text>
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
                  activeOpacity={0.8}
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
              <Ionicons name="git-commit-outline" size={13} color="#38bdf8" />
              <Text style={styles.adminNoteTitle}>Заключение дежурного инженера:</Text>
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
        <ActivityIndicator size="small" color="#38bdf8" />
        <Text style={styles.loadingText}>Синхронизация с реестром...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.7}>
            <Text style={styles.retryBtnText}>Обновить</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTicketItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#38bdf8']} tintColor="#38bdf8" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="file-tray-outline" size={28} color="#475569" />
            </View>
            <Text style={styles.emptyTitle}>Активных инцидентов нет</Text>
            <Text style={styles.emptySubtitle}>
              Журнал пуст. При обнаружении проблем зарегистрируйте новое обращение.
            </Text>
            {onCreateNew && (
              <TouchableOpacity style={styles.createBtn} onPress={onCreateNew} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.createBtnText}>Зарегистрировать инцидент</Text>
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
    backgroundColor: '#0b0f17',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f17',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#f8fafc',
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    color: '#cbd5e1',
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#090d16',
  },
  adminNoteBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderLeftWidth: 2,
    borderLeftColor: '#38bdf8',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  adminNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.3,
  },
  adminNoteText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 18,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 10,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  retryBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
});
