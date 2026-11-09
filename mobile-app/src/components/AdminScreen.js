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
import { fetchTickets, fetchStats, updateTicketStatus, clearAllTickets, getImageUrl } from '../api';

const STATUS_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Ожидают' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'resolved', label: 'Закрытые' },
];

const STATUS_MAP = {
  new: { label: 'Новое', color: '#0369a1', bg: '#e0f2fe' },
  in_progress: { label: 'В работе', color: '#b45309', bg: '#fef3c7' },
  resolved: { label: 'Решено', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Отклонено', color: '#475569', bg: '#f1f5f9' },
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

  // Clear modal
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [clearPin, setClearPin] = useState('');
  const [clearing, setClearing] = useState(false);

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
      Alert.alert('Ошибка', err.message || 'Сбой обновления статуса');
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

  const handleClearDatabase = async () => {
    if (!clearPin.trim()) {
      Alert.alert('Ошибка', 'Введите PIN-код для подтверждения');
      return;
    }
    setClearing(true);
    try {
      await clearAllTickets(clearPin);
      setClearModalVisible(false);
      setClearPin('');
      loadData();
      Alert.alert('Успешно', 'База данных обращений очищена');
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Неверный PIN-код');
    } finally {
      setClearing(false);
    }
  };

  const renderTicketCard = ({ item }) => {
    const statusMeta = STATUS_MAP[item.status] || STATUS_MAP.new;
    const dateStr = item.created_at
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.ticketId}>{incNumber}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={15} color="#0f172a" />
          <Text style={styles.locationTitle}>{item.location}</Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>

        <View style={styles.requesterBox}>
          <Ionicons name="person-outline" size={13} color="#64748b" />
          <Text style={styles.requesterText}>
            {item.contact_name || 'Сотрудник'}
            {item.contact_phone ? `  •  тел: ${item.contact_phone}` : ''}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category || 'Общее'}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Приоритет: {item.priority}</Text>
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
                  style={styles.photoThumbContainer}
                >
                  <Image source={{ uri: fullUrl }} style={styles.thumbImage} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {item.admin_notes ? (
          <View style={styles.adminNotePreview}>
            <Text style={styles.adminNotePreviewTitle}>Служебная отметка:</Text>
            <Text style={styles.adminNotePreviewText} numberOfLines={2}>
              {item.admin_notes}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionsContainer}>
          {item.status === 'new' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnTake]}
              onPress={() => handleStatusChange(item.id, 'in_progress')}
            >
              <Text style={styles.actionBtnWhiteText}>Принять в работу</Text>
            </TouchableOpacity>
          )}

          {item.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnResolve]}
              onPress={() => handleStatusChange(item.id, 'resolved')}
            >
              <Text style={styles.actionBtnWhiteText}>Закрыть обращение</Text>
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
              <Text style={styles.btnReopenText}>Возобновить</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnComment]}
            onPress={() => openCommentModal(item)}
          >
            <Text style={styles.btnCommentText}>
              {item.admin_notes ? 'Редактировать ответ' : 'Внести отметку'}
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
        <View>
          <Text style={styles.adminBarTitle}>Панель диспетчера инцидентов</Text>
          <Text style={styles.adminBarSubtitle}>Управление сервисными обращениями</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={styles.clearDbBtn}
            onPress={() => setClearModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={15} color="#64748b" />
            <Text style={styles.clearDbBtnText}>Очистить журнал</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitBtn} onPress={onExitAdmin}>
            <Text style={styles.exitBtnText}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Всего</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#0369a1' }]}>{stats.new}</Text>
          <Text style={styles.statLabel}>Ожидают</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#b45309' }]}>{stats.in_progress}</Text>
          <Text style={styles.statLabel}>В работе</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#15803d' }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Закрыто</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по локации, описанию или заявителю..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
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
          <ActivityIndicator size="small" color="#0f172a" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicketCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f172a']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Обращений по данному критерию нет</Text>
            </View>
          }
        />
      )}

      {/* Comment / Response Modal */}
      <Modal visible={commentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Отметка по обращению INC-{String(activeTicket?.id).padStart(4, '0')}</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Официальное заключение или комментарий для пользователя:
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Изложите выполненные действия, причины сбоя или рекомендации..."
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
                  <Text style={styles.modalSaveText}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear Database Modal */}
      <Modal visible={clearModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Очистка журнала</Text>
              <TouchableOpacity onPress={() => setClearModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Внимание: все зарегистрированные обращения и вложенные фотоматериалы будут безвозвратно удалены.
            </Text>

            <TextInput
              style={[styles.modalInput, { height: 46 }]}
              placeholder="Введите PIN-код администратора"
              placeholderTextColor="#94a3b8"
              value={clearPin}
              onChangeText={setClearPin}
              secureTextEntry
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setClearModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#dc2626' }]}
                onPress={handleClearDatabase}
                disabled={clearing}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Удалить все</Text>
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
    backgroundColor: '#f8fafc',
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminBarSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  clearDbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  clearDbBtnText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  exitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
  },
  exitBtnText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
    maxWidth: 720,
    alignSelf: 'center',
    width: '94%',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
    maxWidth: 720,
    alignSelf: 'center',
    width: '94%',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
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
    gap: 5,
    marginBottom: 8,
  },
  requesterText: {
    fontSize: 11,
    color: '#64748b',
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
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  photoThumbContainer: {
    position: 'relative',
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  adminNotePreview: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#0f172a',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  adminNotePreviewTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  adminNotePreviewText: {
    fontSize: 12,
    color: '#334155',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnTake: {
    backgroundColor: '#0f172a',
  },
  btnResolve: {
    backgroundColor: '#15803d',
  },
  btnReject: {
    backgroundColor: '#f1f5f9',
  },
  btnRejectText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
  },
  btnReopen: {
    backgroundColor: '#f1f5f9',
  },
  btnReopenText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  btnComment: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginLeft: 'auto',
  },
  btnCommentText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtnWhiteText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    height: 90,
    backgroundColor: '#ffffff',
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 12,
  },
  modalSaveBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
