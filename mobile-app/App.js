import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar as RNStatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import CreateTicketScreen from './src/components/CreateTicketScreen';
import MyTicketsScreen from './src/components/MyTicketsScreen';
import AdminScreen from './src/components/AdminScreen';
import AdminPinModal from './src/components/AdminPinModal';
import SettingsModal from './src/components/SettingsModal';
import PhotoViewerModal from './src/components/PhotoViewerModal';
import { getApiUrl } from './src/config';

export default function App() {
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [userTab, setUserTab] = useState('create'); // 'create' | 'list'
  
  // Modals
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [photoViewerUrl, setPhotoViewerUrl] = useState(null);

  // Connection indicator
  const [serverOnline, setServerOnline] = useState(false);

  const checkConnection = async () => {
    try {
      const base = await getApiUrl();
      const resp = await fetch(`${base}/api/health`);
      setServerOnline(resp.ok);
    } catch (e) {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Main App Bar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="construct" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.appTitle}>SysAdmin Desk</Text>
            <View style={styles.statusIndicatorRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: serverOnline ? '#22c55e' : '#ef4444' },
                ]}
              />
              <Text style={styles.serverStatusText}>
                {serverOnline ? 'Сервер онлайн' : 'Нет связи с сервером'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.appBarRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setSettingsModalVisible(true)}
            accessibilityLabel="Настройки"
          >
            <Ionicons name="settings-outline" size={21} color="#475569" />
          </TouchableOpacity>

          {role === 'user' ? (
            <TouchableOpacity
              style={styles.adminSwitchBtn}
              onPress={() => setPinModalVisible(true)}
            >
              <Ionicons name="shield-outline" size={16} color="#0284c7" />
              <Text style={styles.adminSwitchText}>Сисадмин</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.adminSwitchBtn, { backgroundColor: '#fee2e2' }]}
              onPress={() => setRole('user')}
            >
              <Ionicons name="person-outline" size={16} color="#ef4444" />
              <Text style={[styles.adminSwitchText, { color: '#ef4444' }]}>Режим пользователя</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mode content */}
      {role === 'user' ? (
        <View style={styles.mainContainer}>
          {/* User Tabs */}
          <View style={styles.userTabsContainer}>
            <TouchableOpacity
              style={[styles.userTab, userTab === 'create' && styles.userTabActive]}
              onPress={() => setUserTab('create')}
            >
              <Ionicons
                name="add-circle"
                size={18}
                color={userTab === 'create' ? '#0284c7' : '#64748b'}
              />
              <Text
                style={[
                  styles.userTabText,
                  userTab === 'create' && styles.userTabTextActive,
                ]}
              >
                Новая заявка
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.userTab, userTab === 'list' && styles.userTabActive]}
              onPress={() => setUserTab('list')}
            >
              <Ionicons
                name="list"
                size={18}
                color={userTab === 'list' ? '#0284c7' : '#64748b'}
              />
              <Text
                style={[
                  styles.userTabText,
                  userTab === 'list' && styles.userTabTextActive,
                ]}
              >
                Список заявок
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Tab Content */}
          <View style={{ flex: 1 }}>
            {userTab === 'create' ? (
              <CreateTicketScreen
                onTicketCreated={() => {
                  checkConnection();
                }}
                onViewMyTickets={() => setUserTab('list')}
              />
            ) : (
              <MyTicketsScreen
                onSelectPhoto={(url) => setPhotoViewerUrl(url)}
                onCreateNew={() => setUserTab('create')}
              />
            )}
          </View>
        </View>
      ) : (
        <AdminScreen
          onSelectPhoto={(url) => setPhotoViewerUrl(url)}
          onExitAdmin={() => setRole('user')}
        />
      )}

      {/* Admin PIN Modal */}
      <AdminPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSuccess={() => {
          setPinModalVisible(false);
          setRole('admin');
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onSaved={() => checkConnection()}
      />

      {/* Fullscreen Photo Viewer Modal */}
      <PhotoViewerModal
        visible={!!photoViewerUrl}
        imageUrl={photoViewerUrl}
        onClose={() => setPhotoViewerUrl(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  serverStatusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  adminSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  adminSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  mainContainer: {
    flex: 1,
  },
  userTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  userTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  userTabActive: {
    backgroundColor: '#e0f2fe',
  },
  userTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  userTabTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
});
