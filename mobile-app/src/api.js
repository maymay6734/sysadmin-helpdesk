import { getApiUrl, getCurrentApiUrlSync } from './config';
import { Platform } from 'react-native';

export const getImageUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const base = getCurrentApiUrlSync();
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${cleanPath}`;
};

export const fetchTickets = async (status = null, search = null) => {
  const base = await getApiUrl();
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (search && search.trim()) params.append('search', search.trim());
  
  const url = `${base}/api/tickets?${params.toString()}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Ошибка загрузки заявок (${response.status})`);
  }
  return await response.json();
};

export const fetchTicketById = async (id) => {
  const base = await getApiUrl();
  const response = await fetch(`${base}/api/tickets/${id}`);
  if (!response.ok) {
    throw new Error(`Заявка #${id} не найдена`);
  }
  return await response.json();
};

export const fetchStats = async () => {
  const base = await getApiUrl();
  const response = await fetch(`${base}/api/stats`);
  if (!response.ok) {
    throw new Error(`Ошибка получения статистики`);
  }
  return await response.json();
};

export const verifyAdminPin = async (pin) => {
  const base = await getApiUrl();
  const response = await fetch(`${base}/api/admin/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: pin.trim() }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Неверный PIN-код');
  }
  return await response.json();
};

export const updateTicketStatus = async (ticketId, status, adminNotes = null) => {
  const base = await getApiUrl();
  const body = {};
  if (status !== undefined) body.status = status;
  if (adminNotes !== undefined) body.admin_notes = adminNotes;

  const response = await fetch(`${base}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Ошибка обновления заявки (${response.status})`);
  }
  return await response.json();
};

export const createTicket = async ({
  location,
  description,
  category,
  priority,
  contactName,
  contactPhone,
  photos, // array of { uri, type, fileName }
}) => {
  const base = await getApiUrl();
  const formData = new FormData();
  formData.append('location', location.trim());
  formData.append('description', description.trim());
  formData.append('category', category || 'Общее');
  formData.append('priority', priority || 'Обычный');
  formData.append('contact_name', contactName ? contactName.trim() : 'Сотрудник');
  formData.append('contact_phone', contactPhone ? contactPhone.trim() : '');

  if (photos && photos.length > 0) {
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (Platform.OS === 'web') {
        // In web, photo could be a blob/file or object URL
        if (p.file) {
          formData.append('photos', p.file, p.name || `photo_${i}.jpg`);
        } else if (p.uri) {
          try {
            const res = await fetch(p.uri);
            const blob = await res.blob();
            formData.append('photos', blob, p.name || `photo_${i}.jpg`);
          } catch (e) {
            console.error('Error fetching blob for web upload:', e);
          }
        }
      } else {
        // Native (Android/iOS)
        const filename = p.fileName || p.uri.split('/').pop() || `photo_${i}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : (p.mimeType || 'image/jpeg');
        formData.append('photos', {
          uri: p.uri,
          name: filename,
          type: type,
        });
      }
    }
  }

  const response = await fetch(`${base}/api/tickets`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ошибка создания заявки: ${err}`);
  }
  return await response.json();
};
