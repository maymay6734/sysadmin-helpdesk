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
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'Общее',
        priority TEXT DEFAULT 'Обычный',
        contact_name TEXT DEFAULT 'Сотрудник',
        contact_phone TEXT DEFAULT '',
        status TEXT DEFAULT 'new',
        admin_notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
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
    conn.commit()
    conn.close()

def create_ticket(
    location: str,
    description: str,
    category: str = "Общее",
    priority: str = "Обычный",
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
        query += " AND (location LIKE ? OR description LIKE ? OR contact_name LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
        
    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    tickets = []
    for row in rows:
        t = dict(row)
        cursor.execute("SELECT filename, file_path FROM ticket_images WHERE ticket_id = ?", (t["id"],))
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
    cursor.execute("SELECT filename, file_path FROM ticket_images WHERE ticket_id = ?", (t["id"],))
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

def get_statistics() -> Dict[str, int]:
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
    
    conn.close()
    return {
        "total": total,
        "new": new_count,
        "in_progress": in_progress,
        "resolved": resolved
    }
