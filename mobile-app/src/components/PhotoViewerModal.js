import React from 'react';
import { Modal, View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PhotoViewerModal({ visible, imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.footer}>
          <Ionicons name="image-outline" size={14} color="#94a3b8" />
          <Text style={styles.footerText}>Вложение инцидента</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161e2e',
    borderWidth: 1,
    borderColor: '#222f43',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: Dimensions.get('window').width * 0.94,
    height: Dimensions.get('window').height * 0.76,
    borderRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f293d',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
