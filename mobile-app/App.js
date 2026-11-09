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
  const [role, setRole] = useState('user');
  const [userTab, setUserTab] = useState('create');
  
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
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Modern High-End Dark App Bar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="terminal" size={15} color="#38bdf8" />
          </View>
          <View>
            <Text style={styles.appTitle}>SERVICE DESK</Text>
            <View style={styles.statusIndicatorRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: serverOnline ? '#10b981' : '#f87171' },
                ]}
              />
              <Text style={styles.serverStatusText}>
                {serverOnline ? 'Шлюз активен' : 'Синхронизация...'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.appBarRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setSettingsModalVisible(true)}
            accessibilityLabel="Параметры сети"
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={17} color="#94a3b8" />
          </TouchableOpacity>

          {role === 'user' ? (
            <TouchableOpacity
              style={styles.adminSwitchBtn}
              onPress={() => setPinModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-outline" size={13} color="#38bdf8" />
              <Text style={styles.adminSwitchText}>Диспетчер</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.adminSwitchBtn, styles.adminSwitchBtnActive]}
              onPress={() => setRole('user')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back-outline" size={13} color="#cbd5e1" />
              <Text style={[styles.adminSwitchText, { color: '#cbd5e1' }]}>Пользователь</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      {role === 'user' ? (
        <View style={styles.mainContainer}>
          {/* Linear-style Segmented Navigation */}
          <View style={styles.tabNavWrapper}>
            <View style={styles.userTabsContainer}>
              <TouchableOpacity
                style={[styles.userTab, userTab === 'create' && styles.userTabActive]}
                onPress={() => setUserTab('create')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.userTabText,
                    userTab === 'create' && styles.userTabTextActive,
                  ]}
                >
                  Новое обращение
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.userTab, userTab === 'list' && styles.userTabActive]}
                onPress={() => setUserTab('list')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.userTabText,
                    userTab === 'list' && styles.userTabTextActive,
                  ]}
                >
                  Журнал инцидентов
                </Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#0b0f17',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b0f17',
    borderBottomWidth: 1,
    borderBottomColor: '#161e2e',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1.2,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  serverStatusText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  adminSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 5,
  },
  adminSwitchBtnActive: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  adminSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  mainContainer: {
    flex: 1,
  },
  tabNavWrapper: {
    backgroundColor: '#0b0f17',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  userTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  userTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  userTabActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  userTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  userTabTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});
