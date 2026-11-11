import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "helpdesk.db")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tickets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'Общее',
        priority TEXT DEFAULT 'Средний',
        contact_name TEXT DEFAULT 'Сотрудник',
        contact_phone TEXT DEFAULT '',
        status TEXT DEFAULT 'new',
        admin_notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # Images table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ticket_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );
    """)
    
    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)
    
    # Seed default settings if not exists
    defaults = {
        "admin_pin": "1234",
        "telegram_bot_token": "",
        "telegram_chat_id": "",
        "telegram_enabled": "0",
        "company_name": "IT Service Desk"
    }
    for k, v in defaults.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
        
    conn.commit()
    conn.close()

def get_setting(key: str, default: Optional[str] = None) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return default or ""

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, value))
    conn.commit()
    conn.close()

def get_all_settings() -> Dict[str, str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    result = {row["key"]: row["value"] for row in rows}
    # Hide sensitive telegram token partially for safety in UI
    raw_token = result.get("telegram_bot_token", "")
    if len(raw_token) > 10:
        result["telegram_bot_token_masked"] = raw_token[:6] + "..." + raw_token[-4:]
    else:
        result["telegram_bot_token_masked"] = raw_token
    return result

def create_ticket(
    location: str,
    description: str,
    category: str = "Общее",
    priority: str = "Средний",
    contact_name: str = "Сотрудник",
    contact_phone: str = "",
    image_filenames: Optional[List[str]] = None
) -> Dict[str, Any]:
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO tickets (location, description, category, priority, contact_name, contact_phone, status, admin_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'new', '', ?, ?)
    """, (location, description, category, priority, contact_name, contact_phone, now, now))
    ticket_id = cursor.lastrowid

    if image_filenames:
        for fname in image_filenames:
            cursor.execute("""
                INSERT INTO ticket_images (ticket_id, filename, file_path, created_at)
                VALUES (?, ?, ?, ?)
            """, (ticket_id, fname, f"/uploads/{fname}", now))

    conn.commit()
    conn.close()
    return get_ticket(ticket_id)

def get_tickets(status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM tickets WHERE 1=1"
    params = []
    
    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
        
    if search:
        query += " AND (location LIKE ? OR description LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])
        
    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    tickets = []
    for row in rows:
        t = dict(row)
        cursor.execute("SELECT id, filename, file_path FROM ticket_images WHERE ticket_id = ?", (t["id"],))
        img_rows = cursor.fetchall()
        t["images"] = [dict(img) for img in img_rows]
        tickets.append(t)
        
    conn.close()
    return tickets

def get_ticket(ticket_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    t = dict(row)
    cursor.execute("SELECT id, filename, file_path FROM ticket_images WHERE ticket_id = ?", (t["id"],))
    img_rows = cursor.fetchall()
    t["images"] = [dict(img) for img in img_rows]
    conn.close()
    return t

def update_ticket(ticket_id: int, status: Optional[str] = None, admin_notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    params = []
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if admin_notes is not None:
        updates.append("admin_notes = ?")
        params.append(admin_notes)
        
    if not updates:
        conn.close()
        return get_ticket(ticket_id)
        
    now = datetime.now().isoformat()
    updates.append("updated_at = ?")
    params.append(now)
    params.append(ticket_id)
    
    query = f"UPDATE tickets SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    conn.commit()
    conn.close()
    return get_ticket(ticket_id)

def delete_ticket(ticket_id: int) -> bool:
    """Deletes ticket and its uploaded images from disk."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Find files to delete
    cursor.execute("SELECT filename FROM ticket_images WHERE ticket_id = ?", (ticket_id,))
    rows = cursor.fetchall()
    for row in rows:
        fname = row["filename"]
        fpath = os.path.join(UPLOAD_DIR, fname)
        if os.path.isfile(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass
                
    cursor.execute("DELETE FROM ticket_images WHERE ticket_id = ?", (ticket_id,))
    cursor.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    conn.commit()
    conn.close()
    return True

def clear_all_tickets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ticket_images")
    cursor.execute("DELETE FROM tickets")
    try:
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('tickets', 'ticket_images')")
    except Exception:
        pass
    conn.commit()
    conn.close()

    # Clean local uploads
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass

def get_statistics() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM tickets")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'new'")
    new_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'in_progress'")
    in_progress = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'resolved'")
    resolved = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'rejected'")
    rejected = cursor.fetchone()[0]
    
    conn.close()
    return {
        "total": total,
        "new": new_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "rejected": rejected
    }
