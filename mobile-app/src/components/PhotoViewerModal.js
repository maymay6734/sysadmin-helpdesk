import React from 'react';
import { Modal, View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PhotoViewerModal({ visible, imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close-circle" size={38} color="#ffffff" />
        </TouchableOpacity>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.footer}>
          <Text style={styles.footerText}>Фотография проблемы</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  image: {
    width: Dimensions.get('window').width * 0.95,
    height: Dimensions.get('window').height * 0.75,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
