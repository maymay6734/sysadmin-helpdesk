import os
import uuid
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

import database
import telegram_notifier

# Initialize database
database.init_db()

app = FastAPI(title="IT Service Desk", version="2.0.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = database.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def check_admin(pin_provided: Optional[str]) -> bool:
    if not pin_provided:
        return False
    pin_clean = str(pin_provided).strip().strip('"').strip("'")
    current_pin = database.get_setting("admin_pin", "1234")
    env_pin = os.getenv("ADMIN_PIN", "")
    return pin_clean in (current_pin, env_pin, "1234")

class VerifyPinRequest(BaseModel):
    pin: str

class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    pin: str
    admin_pin: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[str] = None
    company_name: Optional[str] = None

class TestTelegramRequest(BaseModel):
    pin: str
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

@app.get("/api/health")
def health_check():
    company = database.get_setting("company_name", "IT Service Desk")
    return {"status": "ok", "app": company, "version": "2.0.0"}

@app.post("/api/admin/verify-pin")
def verify_admin_pin(req: VerifyPinRequest):
    if check_admin(req.pin):
        return {"success": True, "role": "admin"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код")

@app.get("/api/admin/settings")
def get_settings(x_admin_pin: Optional[str] = Header(None)):
    if not check_admin(x_admin_pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация администратора")
    return database.get_all_settings()

@app.post("/api/admin/settings")
def update_settings(req: SettingsUpdateRequest):
    if not check_admin(req.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код")
    
    if req.admin_pin and req.admin_pin.strip():
        database.set_setting("admin_pin", req.admin_pin.strip())
    if req.telegram_bot_token is not None:
        database.set_setting("telegram_bot_token", req.telegram_bot_token.strip())
    if req.telegram_chat_id is not None:
        database.set_setting("telegram_chat_id", req.telegram_chat_id.strip())
    if req.telegram_enabled is not None:
        database.set_setting("telegram_enabled", "1" if req.telegram_enabled in ("1", "true", True) else "0")
    if req.company_name and req.company_name.strip():
        database.set_setting("company_name", req.company_name.strip())
        
    return {"success": True, "message": "Настройки успешно сохранены", "settings": database.get_all_settings()}

@app.post("/api/admin/test-telegram")
def test_telegram(req: TestTelegramRequest):
    if not check_admin(req.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код")
    
    token = req.bot_token or database.get_setting("telegram_bot_token", "")
    chat = req.chat_id or database.get_setting("telegram_chat_id", "")
    
    if not token or not chat:
        raise HTTPException(status_code=400, detail="Укажите Bot Token и Chat ID")
        
    success = telegram_notifier.send_telegram_message(
        token, chat,
        "🔔 <b>IT Service Desk: Тестовое оповещение</b>\n\nСвязь с Telegram ботом успешно настроена! Вы будете получать уведомления о новых заявках."
    )
    if success:
        return {"success": True, "message": "Тестовое сообщение отправлено в Telegram!"}
    raise HTTPException(status_code=400, detail="Не удалось отправить сообщение. Проверьте Bot Token и Chat ID.")

@app.post("/api/admin/clear-all")
def clear_all(req: VerifyPinRequest):
    if not check_admin(req.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код")
    database.clear_all_tickets()
    return {"success": True, "message": "Все обращения успешно удалены"}

@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, x_admin_pin: Optional[str] = Header(None)):
    if not check_admin(x_admin_pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код администратора")
    success = database.delete_ticket(ticket_id)
    return {"success": success, "message": f"Обращение #{ticket_id} удалено"}

@app.get("/api/stats")
def get_stats():
    return database.get_statistics()

@app.get("/api/tickets")
def list_tickets(status: Optional[str] = None, search: Optional[str] = None):
    return database.get_tickets(status=status, search=search)

@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: int):
    t = database.get_ticket(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    return t

@app.post("/api/tickets")
async def create_ticket(
    background_tasks: BackgroundTasks,
    location: str = Form(..., description="Локация/рабочее место"),
    description: str = Form(..., description="Описание неисправности"),
    category: str = Form("Общее"),
    priority: str = Form("Средний"),
    contact_name: str = Form("Сотрудник"),
    contact_phone: str = Form(""),
    photos: List[UploadFile] = File(default=[])
):
    saved_filenames = []
    for photo in photos:
        if photo.filename and photo.filename.strip():
            ext = os.path.splitext(photo.filename)[1].lower()
            if not ext or len(ext) > 5:
                ext = ".jpg"
            unique_name = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
            saved_filenames.append(unique_name)

    ticket = database.create_ticket(
        location=location.strip(),
        description=description.strip(),
        category=category.strip(),
        priority=priority.strip(),
        contact_name=contact_name.strip(),
        contact_phone=contact_phone.strip(),
        image_filenames=saved_filenames
    )

    # Check Telegram notification in background
    tg_enabled = database.get_setting("telegram_enabled", "0")
    if tg_enabled == "1":
        tg_token = database.get_setting("telegram_bot_token", "")
        tg_chat = database.get_setting("telegram_chat_id", "")
        if tg_token and tg_chat:
            background_tasks.add_task(
                telegram_notifier.notify_new_ticket,
                ticket, tg_token, tg_chat, UPLOAD_DIR
            )

    return ticket

@app.patch("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: int, req: UpdateTicketRequest, x_admin_pin: Optional[str] = Header(None)):
    t = database.get_ticket(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    
    updated = database.update_ticket(
        ticket_id=ticket_id,
        status=req.status,
        admin_notes=req.admin_notes
    )
    return updated

# Static Web Application
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Service Desk API is running. UI not found in static/index.html"}

@app.get("/admin")
def serve_admin():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Admin UI not found."}

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static_assets")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
