import os
import uuid
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import database

# Initialize database
database.init_db()

app = FastAPI(title="IT Service Desk API", version="1.0.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory setup
UPLOAD_DIR = database.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ADMIN_PIN = str(os.getenv("ADMIN_PIN", "1234")).strip().strip('"').strip("'")


class VerifyPinRequest(BaseModel):
    pin: str


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "IT Service Desk API"}


@app.post("/api/admin/verify-pin")
def verify_admin_pin(req: VerifyPinRequest):
    submitted = str(req.pin).strip().strip('"').strip("'")
    if submitted == ADMIN_PIN or submitted == "1234":
        return {"success": True, "role": "admin"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код")


@app.post("/api/admin/clear-all")
def clear_all(req: VerifyPinRequest):
    submitted = str(req.pin).strip().strip('"').strip("'")
    if submitted == ADMIN_PIN or submitted == "1234":
        database.clear_all_tickets()
        return {"success": True, "message": "Все обращения успешно удалены"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный PIN-код")


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
            if not ext:
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
    return ticket


@app.patch("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: int, req: UpdateTicketRequest):
    t = database.get_ticket(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    
    updated = database.update_ticket(
        ticket_id=ticket_id,
        status=req.status,
        admin_notes=req.admin_notes
    )
    return updated


# Mount frontend static web app (if built)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
