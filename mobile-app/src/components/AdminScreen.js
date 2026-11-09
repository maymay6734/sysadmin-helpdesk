import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTickets, fetchStats, updateTicketStatus, getImageUrl } from '../api';

const STATUS_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Новые' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'resolved', label: 'Решенные' },
];

const STATUS_MAP = {
  new: { label: 'Новая', color: '#0284c7', bg: '#e0f2fe', icon: 'sparkles' },
  in_progress: { label: 'В работе', color: '#d97706', bg: '#fef3c7', icon: 'construct' },
  resolved: { label: 'Выполнено', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  rejected: { label: 'Отклонено', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
};

export default function AdminScreen({ onSelectPhoto, onExitAdmin }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, in_progress: 0, resolved: 0 });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Comment Modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ticketsData, statsData] = await Promise.all([
        fetchTickets(selectedStatus, search),
        fetchStats(),
      ]);
      setTickets(ticketsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось связаться с сервером');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      loadData();
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось обновить статус');
    }
  };

  const openCommentModal = (ticket) => {
    setActiveTicket(ticket);
    setAdminComment(ticket.admin_notes || '');
    setCommentModalVisible(true);
  };

  const saveComment = async () => {
    if (!activeTicket) return;
    setSavingComment(true);
    try {
      await updateTicketStatus(activeTicket.id, undefined, adminComment);
      setCommentModalVisible(false);
      setActiveTicket(null);
      loadData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сохранить комментарий');
    } finally {
      setSavingComment(false);
    }
  };

  const renderTicketCard = ({ item }) => {
    const statusMeta = STATUS_MAP[item.status] || STATUS_MAP.new;
    const dateStr = item.created_at
      ? new Date(item.created_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <View style={styles.card}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.ticketId}>#{item.id}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={12} color={statusMeta.color} />
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        {/* Location - High visibility */}
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={18} color="#0284c7" />
          <Text style={styles.locationTitle}>{item.location}</Text>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText}>{item.description}</Text>

        {/* Requester Contact */}
        <View style={styles.requesterBox}>
          <Ionicons name="person" size={14} color="#64748b" />
          <Text style={styles.requesterText}>
            {item.contact_name || 'Сотрудник'}
            {item.contact_phone ? `  •  тел: ${item.contact_phone}` : ''}
          </Text>
        </View>

        {/* Badges */}
        <View style={styles.metaRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category || 'Общее'}</Text>
          </View>
          <View
            style={[
              styles.tag,
              item.priority.includes('Срочно')
                ? { backgroundColor: '#fee2e2' }
                : item.priority === 'Высокий'
                ? { backgroundColor: '#fef3c7' }
                : null,
            ]}
          >
            <Text
              style={[
                styles.tagText,
                item.priority.includes('Срочно')
                  ? { color: '#dc2626' }
                  : item.priority === 'Высокий'
                  ? { color: '#d97706' }
                  : null,
              ]}
            >
              {item.priority}
            </Text>
          </View>
        </View>

        {/* Photos */}
        {item.images && item.images.length > 0 && (
          <View style={styles.photosRow}>
            {item.images.map((img, i) => {
              const fullUrl = getImageUrl(img.file_path);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => onSelectPhoto && onSelectPhoto(fullUrl)}
                  style={styles.photoThumbContainer}
                >
                  <Image source={{ uri: fullUrl }} style={styles.thumbImage} />
                  <View style={styles.photoZoomOverlay}>
                    <Ionicons name="search" size={14} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Admin note preview */}
        {item.admin_notes ? (
          <View style={styles.adminNotePreview}>
            <Ionicons name="chatbubble-ellipses" size={14} color="#0284c7" />
            <Text style={styles.adminNotePreviewText} numberOfLines={2}>
              {item.admin_notes}
            </Text>
          </View>
        ) : null}

        {/* Admin Action Buttons */}
        <View style={styles.actionsContainer}>
          {item.status === 'new' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnTake]}
              onPress={() => handleStatusChange(item.id, 'in_progress')}
            >
              <Ionicons name="play" size={14} color="#ffffff" />
              <Text style={styles.actionBtnWhiteText}>Взять в работу</Text>
            </TouchableOpacity>
          )}

          {item.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnResolve]}
              onPress={() => handleStatusChange(item.id, 'resolved')}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.actionBtnWhiteText}>Выполнено</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'resolved' && item.status !== 'rejected' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReject]}
              onPress={() => handleStatusChange(item.id, 'rejected')}
            >
              <Text style={styles.btnRejectText}>Отклонить</Text>
            </TouchableOpacity>
          )}

          {item.status === 'resolved' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReopen]}
              onPress={() => handleStatusChange(item.id, 'in_progress')}
            >
              <Ionicons name="refresh" size={14} color="#475569" />
              <Text style={styles.btnReopenText}>Вернуть в работу</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnComment]}
            onPress={() => openCommentModal(item)}
          >
            <Ionicons name="create-outline" size={15} color="#0284c7" />
            <Text style={styles.btnCommentText}>
              {item.admin_notes ? 'Изменить ответ' : 'Ответить'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Admin Bar */}
      <View style={styles.topAdminBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="shield-checkmark" size={20} color="#0284c7" />
          <Text style={styles.adminBarTitle}>Панель сисадмина</Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={onExitAdmin}>
          <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          <Text style={styles.exitBtnText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Всего</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#0284c7', borderLeftWidth: 3 }]}>
          <Text style={[styles.statValue, { color: '#0284c7' }]}>{stats.new}</Text>
          <Text style={styles.statLabel}>Новые</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#d97706', borderLeftWidth: 3 }]}>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.in_progress}</Text>
          <Text style={styles.statLabel}>В работе</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#16a34a', borderLeftWidth: 3 }]}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Решено</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по кабинету, описанию или имени..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setSelectedStatus(tab.id)}
            >
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ticket List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicketCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Нет заявок по данному фильтру</Text>
            </View>
          }
        />
      )}

      {/* Comment / Response Modal */}
      <Modal visible={commentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ответ по заявке #{activeTicket?.id}</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Этот комментарий увидят сотрудники в статусе заявки:
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Например: Заменил картридж, перезагрузил свитч, всё работает."
              placeholderTextColor="#94a3b8"
              value={adminComment}
              onChangeText={setAdminComment}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCommentModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveComment}
                disabled={savingComment}
              >
                {savingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Сохранить ответ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  topAdminBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  adminBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  exitBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#0284c7',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 8,
  },
  requesterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  requesterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
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
    marginBottom: 12,
  },
  photoThumbContainer: {
    position: 'relative',
  },
  thumbImage: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  photoZoomOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 3,
  },
  adminNotePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginBottom: 10,
  },
  adminNotePreviewText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnTake: {
    backgroundColor: '#0284c7',
  },
  btnResolve: {
    backgroundColor: '#16a34a',
  },
  btnReject: {
    backgroundColor: '#fee2e2',
  },
  btnRejectText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  btnReopen: {
    backgroundColor: '#f1f5f9',
  },
  btnReopenText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  btnComment: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginLeft: 'auto',
  },
  btnCommentText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnWhiteText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    height: 100,
    backgroundColor: '#f8fafc',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
