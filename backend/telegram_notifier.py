import os
import json
import uuid
import mimetypes
import urllib.request
import urllib.error
from typing import Optional, List

def send_telegram_message(bot_token: str, chat_id: str, text: str) -> bool:
    """Send text message to Telegram via urllib (zero external dependencies)."""
    if not bot_token or not chat_id:
        return False
    
    url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id.strip(),
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("ok", False)
    except Exception as e:
        print(f"[Telegram] Error sending message: {e}")
        return False

def _build_multipart(fields: dict, files: dict, boundary: str) -> bytes:
    """Helper to build multipart/form-data payload using standard library."""
    lines = []
    for key, value in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{key}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(value).encode("utf-8"))
    
    for key, (filename, file_bytes, content_type) in files.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"'.encode("utf-8"))
        lines.append(f"Content-Type: {content_type}".encode("utf-8"))
        lines.append(b"")
        lines.append(file_bytes)
    
    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")
    return b"\r\n".join(lines)

def send_telegram_photo(bot_token: str, chat_id: str, caption: str, photo_path: str) -> bool:
    """Send photo with caption to Telegram via multipart/form-data."""
    if not bot_token or not chat_id or not os.path.exists(photo_path):
        return False
        
    url = f"https://api.telegram.org/bot{bot_token.strip()}/sendPhoto"
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    
    try:
        with open(photo_path, "rb") as f:
            photo_bytes = f.read()
            
        filename = os.path.basename(photo_path)
        mime_type, _ = mimetypes.guess_type(filename)
        mime_type = mime_type or "image/jpeg"
        
        fields = {
            "chat_id": chat_id.strip(),
            "caption": caption[:1024],
            "parse_mode": "HTML"
        }
        files = {
            "photo": (filename, photo_bytes, mime_type)
        }
        
        body = _build_multipart(fields, files, boundary)
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
        )
        
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("ok", False)
    except Exception as e:
        print(f"[Telegram] Error sending photo: {e}")
        # Fallback to plain text message if photo upload fails
        return send_telegram_message(bot_token, chat_id, caption)

def notify_new_ticket(ticket: dict, bot_token: str, chat_id: str, upload_dir: str):
    """Format and send a rich ticket notification to Telegram."""
    if not bot_token or not chat_id:
        return
        
    t_id = ticket.get("id", "?")
    loc = ticket.get("location", "Не указана")
    name = ticket.get("contact_name", "Сотрудник")
    phone = ticket.get("contact_phone", "")
    phone_str = f" ({phone})" if phone else ""
    cat = ticket.get("category", "Общее")
    prio = ticket.get("priority", "Обычный")
    desc = ticket.get("description", "—")
    
    prio_emoji = "🔥" if ("срочн" in prio.lower() or "критич" in prio.lower() or "высок" in prio.lower()) else "📌"
    
    msg = (
        f"🚨 <b>Новая заявка #{t_id}</b>\n\n"
        f"📍 <b>Локация:</b> {loc}\n"
        f"👤 <b>Заявитель:</b> {name}{phone_str}\n"
        f"🏷 <b>Категория:</b> {cat}\n"
        f"{prio_emoji} <b>Приоритет:</b> {prio}\n\n"
        f"📝 <b>Описание проблемы:</b>\n{desc}\n"
    )
    
    images = ticket.get("images", [])
    if images:
        first_img = images[0]
        filename = first_img.get("filename")
        if filename:
            photo_path = os.path.join(upload_dir, filename)
            if os.path.exists(photo_path):
                if len(images) > 1:
                    msg += f"\n<i>(Прикреплено фото: 1 из {len(images)})</i>"
                send_telegram_photo(bot_token, chat_id, msg, photo_path)
                return
                
    send_telegram_message(bot_token, chat_id, msg)
