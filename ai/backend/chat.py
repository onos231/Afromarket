from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Dict, List

from .database import get_db
from .auth import get_current_user
from . import models

router = APIRouter()

# Pydantic schema for incoming messages
class ChatCreate(BaseModel):
    content: str

# Helper serializer
def serialize_chat(chat: models.ChatMessage):
    return {
        "id": chat.id,
        "offer_id": chat.offer_id,
        "sender": chat.sender,
        "content": chat.content,
        "timestamp": chat.timestamp.isoformat() if chat.timestamp else None,
    }

# GET all messages for an offer
@router.get("/offers/{offer_id}/chat")
def get_chat_messages(offer_id: str, db: Session = Depends(get_db)):
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.offer_id == offer_id)
        .order_by(models.ChatMessage.timestamp.asc())
        .all()
    )
    return {"messages": [serialize_chat(m) for m in messages]}

# POST a new message
@router.post("/offers/{offer_id}/chat")
def post_chat_message(
    offer_id: str,
    chat: ChatCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    new_chat = models.ChatMessage(
        offer_id=offer_id,
        sender=current_user,
        content=chat.content,
        timestamp=datetime.utcnow(),
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)

    return {"chat": serialize_chat(new_chat)}

# Keep track of active connections per offer
active_connections: Dict[str, List[WebSocket]] = {}

async def broadcast_message(offer_id: str, message: dict):
    if offer_id in active_connections:
        for connection in active_connections[offer_id]:
            try:
                await connection.send_json(message)
            except Exception:
                # Drop broken connections
                active_connections[offer_id].remove(connection)

@router.websocket("/ws/chat/{offer_id}")
async def websocket_chat(websocket: WebSocket, offer_id: str, db: Session = Depends(get_db)):
    await websocket.accept()

    if offer_id not in active_connections:
        active_connections[offer_id] = []
    active_connections[offer_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            sender = data.get("sender")
            content = data.get("content")

            new_chat = models.ChatMessage(
                offer_id=offer_id,
                sender=sender,
                content=content,
                timestamp=datetime.utcnow(),
            )
            db.add(new_chat)
            db.commit()
            db.refresh(new_chat)

            # Broadcast to all connected clients
            await broadcast_message(offer_id, serialize_chat(new_chat))
    except WebSocketDisconnect:
        active_connections[offer_id].remove(websocket)
