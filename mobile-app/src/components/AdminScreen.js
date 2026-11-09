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
  new: { label: 'Новый', dot: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.25)' },
  in_progress: { label: 'В работе', dot: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
  resolved: { label: 'Закрыт', dot: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  rejected: { label: 'Отклонен', dot: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' },
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
      Alert.alert('Ошибка', 'Не удалось сохранить служебную отметку');
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
      Alert.alert('Готово', 'Реестр обращений полностью очищен');
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
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={[styles.statusBadgeText, { color: statusMeta.dot }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color="#38bdf8" />
          <Text style={styles.locationTitle}>{item.location}</Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>

        <View style={styles.requesterBox}>
          <Ionicons name="person-outline" size={12} color="#64748b" />
          <Text style={styles.requesterText}>
            {item.contact_name || 'Сотрудник'}
            {item.contact_phone ? `  •  ${item.contact_phone}` : ''}
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
                  activeOpacity={0.8}
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
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnWhiteText}>В работу</Text>
            </TouchableOpacity>
          )}

          {item.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnResolve]}
              onPress={() => handleStatusChange(item.id, 'resolved')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnWhiteText}>Закрыть инцидент</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'resolved' && item.status !== 'rejected' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReject]}
              onPress={() => handleStatusChange(item.id, 'rejected')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnRejectText}>Отклонить</Text>
            </TouchableOpacity>
          )}

          {item.status === 'resolved' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReopen]}
              onPress={() => handleStatusChange(item.id, 'in_progress')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnReopenText}>Возобновить</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnComment]}
            onPress={() => openCommentModal(item)}
            activeOpacity={0.8}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.adminBarTitle}>Консоль инженера</Text>
            <View style={styles.engineerBadge}>
              <Text style={styles.engineerBadgeText}>TIER-1</Text>
            </View>
          </View>
          <Text style={styles.adminBarSubtitle}>Диспетчеризация и контроль инцидентов</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={styles.clearDbBtn}
            onPress={() => setClearModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color="#94a3b8" />
            <Text style={styles.clearDbBtnText}>Очистить</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitBtn} onPress={onExitAdmin} activeOpacity={0.7}>
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
          <Text style={[styles.statValue, { color: '#38bdf8' }]}>{stats.new}</Text>
          <Text style={styles.statLabel}>Ожидают</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.in_progress}</Text>
          <Text style={styles.statLabel}>В работе</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Закрыто</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={15} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по локации, инциденту или сотруднику..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={15} color="#64748b" />
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
              activeOpacity={0.7}
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
          <ActivityIndicator size="small" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicketCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#38bdf8']} tintColor="#38bdf8" />
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
              <Text style={styles.modalTitle}>Служебная отметка INC-{String(activeTicket?.id).padStart(4, '0')}</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="#94a3b8" />
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
              placeholderTextColor="#475569"
              value={adminComment}
              onChangeText={setAdminComment}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCommentModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveComment}
                disabled={savingComment}
                activeOpacity={0.8}
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
              <Text style={styles.modalTitle}>Сброс реестра инцидентов</Text>
              <TouchableOpacity onPress={() => setClearModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Внимание: все обращения и вложения будут безвозвратно удалены.
            </Text>

            <TextInput
              style={[styles.modalInput, { height: 44 }]}
              placeholder="PIN-код администратора"
              placeholderTextColor="#475569"
              value={clearPin}
              onChangeText={setClearPin}
              secureTextEntry
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setClearModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#dc2626' }]}
                onPress={handleClearDatabase}
                disabled={clearing}
                activeOpacity={0.8}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Очистить все</Text>
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
    backgroundColor: '#0b0f17',
  },
  topAdminBar: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  adminBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.2,
  },
  engineerBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  engineerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
  },
  adminBarSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  clearDbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#090d16',
  },
  clearDbBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  exitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
  },
  exitBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
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
    backgroundColor: '#111827',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
    maxWidth: 680,
    alignSelf: 'center',
    width: '94%',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#f8fafc',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
    maxWidth: 680,
    alignSelf: 'center',
    width: '94%',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#111827',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtnActive: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 13,
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
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusBadgeText: {
    fontSize: 10,
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
    color: '#f8fafc',
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#94a3b8',
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
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#64748b',
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
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#090d16',
  },
  adminNotePreview: {
    backgroundColor: '#090d16',
    borderLeftWidth: 2,
    borderLeftColor: '#38bdf8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  adminNotePreviewTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  adminNotePreviewText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnTake: {
    backgroundColor: '#2563eb',
  },
  btnResolve: {
    backgroundColor: '#059669',
  },
  btnReject: {
    backgroundColor: '#1e293b',
  },
  btnRejectText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  btnReopen: {
    backgroundColor: '#1e293b',
  },
  btnReopenText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  btnComment: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginLeft: 'auto',
  },
  btnCommentText: {
    color: '#38bdf8',
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
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#f8fafc',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
    lineHeight: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    height: 90,
    backgroundColor: '#090d16',
    fontSize: 13,
    color: '#f8fafc',
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
    backgroundColor: '#1e293b',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  modalSaveBtn: {
    backgroundColor: '#2563eb',
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
