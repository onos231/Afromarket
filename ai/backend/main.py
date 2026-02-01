import logging
import uuid
import json
import sqlalchemy
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

# 👇 Local imports
from ai.backend.database import SessionLocal, engine, Base, get_async_db, init_db
from ai.backend.models import Offer, ChatMessage
from ai.backend.auth import router as auth_router, get_current_user
from . import models
from . import chat


# ✅ Pydantic schema for chat
class ChatMessageCreate(BaseModel):
    content: str


# ✅ Logging setup
logging.basicConfig(level=logging.DEBUG)

# ✅ Create tables once
Base.metadata.create_all(bind=engine)

print("SQLAlchemy version:", sqlalchemy.__version__)
with engine.connect() as conn:
    tables = conn.exec_driver_sql(
        "SELECT name FROM sqlite_master WHERE type='table';"
    ).fetchall()
    print("Tables created:", tables)


# ✅ FastAPI app
app = FastAPI()

# ✅ Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 👇 Include your auth router if needed
app.include_router(auth_router)
app.include_router(chat.router)

@app.on_event("startup")
def on_startup():
    init_db()

# Dependency: get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper: clean SQLAlchemy objects
def to_dict(obj):
    data = obj.__dict__.copy()
    data.pop("_sa_instance_state", None)
    return data

# Pydantic schemas for input
class Item(BaseModel):
    name: str
    quantity: str
    category: str
    image: Optional[str] = None
    owner: Optional[str] = None

class OfferCreate(BaseModel):
    have_item: Item
    want_item: Item
    location: str
    message: Optional[str] = None

# 🔧 Helper: badge mapping
def badge_for_status(status: str) -> str:
    if status == "pending":
        return "🟢 Pending"
    elif status == "matched":
        return "🟡 Matched"
    elif status in ["completed", "declined"]:
        return "🔴 " + status.capitalize()
    else:
        return status

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token = jwt.encode({"sub": user.username}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": access_token, "token_type": "bearer"}


# ✅ Create an offer
@app.post("/offers")
def create_offer(
    offer: OfferCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    print("Incoming offer JSON:", offer.dict()) # ✅ Debug
    def categorize_item(name: str) -> str:
        name = name.lower()
        if name in ["rice", "maize", "millet", "sorghum"]:
            return "Grains"
        elif name in ["yam", "cassava", "cocoyam", "sweet potato"]:
            return "Tubers"
        elif name in ["palm oil", "groundnut oil", "vegetable oil"]:
            return "Oils"
        elif name in ["beans", "lentils", "soybeans"]:
            return "Legumes"
        elif name in ["onion", "garlic", "ginger"]:
            return "Spices"
        else:
            return "Misc"

    new_offer = Offer(
        id=str(uuid.uuid4()),
        have_name=offer.have_item.name.lower(),
        have_quantity=offer.have_item.quantity,
        have_category=categorize_item(offer.have_item.name),
        have_image=offer.have_item.image,
        have_owner=current_user,
        want_name=offer.want_item.name.lower(),
        want_quantity=offer.want_item.quantity,
        want_category=categorize_item(offer.want_item.name),
        want_image=offer.want_item.image,
        want_owner=offer.want_item.owner,
        location=offer.location,
        message=offer.message,
        status="pending",
        timestamp=datetime.utcnow(), # ✅ pass actual datetime object
    )

    # ✅ Debug print at same level as db.add
    print("Saved offer:", new_offer)

    db.add(new_offer)

    # 🔍 Try to find reciprocal match
    match = db.query(Offer).filter(
        Offer.have_name == new_offer.want_name,
        Offer.want_name == new_offer.have_name,
        Offer.status == "pending",
        Offer.have_owner != current_user
    ).first()

    if match:
        new_offer.status = "matched"
        new_offer.matched_with = match.id
        match.status = "matched"
        match.matched_with = new_offer.id
        db.add(match)

    db.commit()
    db.refresh(new_offer)

    return {
        "message": "Offer created",
        "offer": {**to_dict(new_offer), "badge": badge_for_status(new_offer.status)}
    }


# ✅ List ALL offers (landing page)
@app.get("/offers")
def list_offers(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1
    total = db.query(Offer).count()
    offset = (page - 1) * page_size
    offers = db.query(Offer).offset(offset).limit(page_size).all()

    # ✅ Debug
    print("Offers in DB:", [o.have_owner for o in offers])
    total_pages = (total + page_size - 1) // page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
        "offers": [{**to_dict(o), "badge": badge_for_status(o.status)} for o in offers]
    }




# ✅ List MY offers (personal dashboard)
@app.get("/offers/my")
def list_my_offers(
    page: int = 1,
    page_size: int = 20,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1
    query = db.query(Offer).filter(Offer.have_owner == current_user)
    total = query.count()
    offset = (page - 1) * page_size
    offers = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
        "offers": [{**to_dict(o), "badge": badge_for_status(o.status)} for o in offers]
    }


# ✅ Get active offers (pending + matched) for current user
@app.get("/offers/active")
def list_active_offers(
    page: int = 1,
    page_size: int = 20,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1
    query = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status.in_(["pending", "matched"])
    )
    total = query.count()
    offset = (page - 1) * page_size
    offers = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
        "active_offers": [{**to_dict(o), "badge": badge_for_status(o.status)} for o in offers]
    }


# ✅ Get offer history (completed or declined) for current user
@app.get("/offers/history")
def offer_history(
    page: int = 1,
    page_size: int = 20,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1
    query = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status.in_(["completed", "declined"])
    )
    total = query.count()
    offset = (page - 1) * page_size
    offers = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
        "history": [{**to_dict(o), "badge": badge_for_status(o.status)} for o in offers]
    }


# ✅ Get only matched offers (your side only)
@app.get("/offers/matches")
def list_matched_offers(
    page: int = 1,
    page_size: int = 20,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1

    query = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status == "matched"
    )

    total = query.count()
    offset = (page - 1) * page_size
    offers = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
        "matches": [{**to_dict(o), "badge": badge_for_status(o.status)} for o in offers]
    }


# ✅ Get matched offers with both sides
@app.get("/offers/matches/full")
def list_full_matches(
    page: int = 1,
    page_size: int = 20,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1

    query = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status == "matched"
    )

    total = query.count()
    offset = (page - 1) * page_size
    matched_offers = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    results = []
    for o in matched_offers:
        partner = db.query(Offer).filter(Offer.id == o.matched_with).first()
        results.append({
            "your_offer": {**to_dict(o), "badge": badge_for_status(o.status)},
            "matched_offer": (
                {**to_dict(partner), "badge": badge_for_status(partner.status)}
                if partner else None
            )
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
        "matches": results
    }


# ✅ Mark an offer as completed
@app.patch("/offers/{offer_id}/complete")
def complete_offer(
    offer_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(
        Offer.id == offer_id,
        Offer.have_owner == current_user
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer.status != "matched":
        raise HTTPException(status_code=400, detail="Offer is not matched yet")

    offer.status = "completed"
    db.add(offer)

    if offer.matched_with:
        partner = db.query(Offer).filter(Offer.id == offer.matched_with).first()
        if partner:
            partner.status = "completed"
            db.add(partner)

    db.commit()
    db.refresh(offer)

    return {
        "message": "Offer marked as completed",
        "offer": {**to_dict(offer), "badge": badge_for_status(offer.status)}
    }

# ✅ Decline a matched offer
@app.patch("/offers/{offer_id}/decline")
def decline_offer(
    offer_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(
        Offer.id == offer_id,
        Offer.have_owner == current_user
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer.status != "matched":
        raise HTTPException(status_code=400, detail="Offer is not matched, cannot decline")

    offer.status = "declined"
    db.add(offer)

    if offer.matched_with:
        partner = db.query(Offer).filter(Offer.id == offer.matched_with).first()
        if partner:
            partner.status = "declined"
            db.add(partner)

    db.commit()
    db.refresh(offer)

    return {
        "message": "Offer declined",
        "offer": {**to_dict(offer), "badge": badge_for_status(offer.status)}
    }

# ✅ Get single offer by ID
@app.get("/offers/{offer_id}")
def get_offer(offer_id: str, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

        print("Returning offers:", offers) # ✅ Debug
    return {**to_dict(offer), "badge": badge_for_status(offer.status)}



# Helper: generate secure code
def generate_secure_code(length: int = 20) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# ✅ Creator generates code
@app.post("/offers/{offer_id}/generate-code")
def generate_code(
    offer_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer.have_owner != current_user:
        raise HTTPException(status_code=403, detail="Only the creator can generate the code")

    code = generate_secure_code()
    offer.completion_code = code
    offer.status = "code_generated"
    db.add(offer)
    db.commit()
    db.refresh(offer)

    return {"message": "Code generated successfully", "code": code}

# ✅ Responder confirms code
@app.post("/offers/{offer_id}/confirm-code")
def confirm_code(
    offer_id: str,
    code: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer.want_owner != current_user:
        raise HTTPException(status_code=403, detail="Only the responder can confirm the code")

    if offer.completion_code != code:
        raise HTTPException(status_code=400, detail="Invalid code")

    offer.status = "completed"
    offer.confirmed_by = current_user
    offer.completion_code = None

    if offer.matched_with:
        partner = db.query(Offer).filter(Offer.id == offer.matched_with).first()
        if partner:
            partner.status = "completed"
            db.add(partner)

    db.add(offer)
    db.commit()
    db.refresh(offer)

    return {"message": "Swap completed successfully", "offer": to_dict(offer)}

# ✅ Decline swap (either user)
@app.post("/offers/{offer_id}/decline-swap")
def decline_swap(
    offer_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if current_user not in [offer.have_owner, offer.want_owner]:
        raise HTTPException(status_code=403, detail="You are not part of this swap")

    offer.status = "declined"
    if offer.matched_with:
        partner = db.query(Offer).filter(Offer.id == offer.matched_with).first()
        if partner:
            partner.status = "declined"
            db.add(partner)

    db.add(offer)
    db.commit()
    db.refresh(offer)

    return {"message": "Swap declined", "offer": to_dict(offer)}

    # ✅ Send a message
@app.post("/offers/{offer_id}/chat")
def send_message(
    offer_id: str,
    msg: ChatMessageCreate,  # ✅ now defined
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = ChatMessage(
        offer_id=offer_id,
        sender=current_user,
        content=msg.content
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"message": "sent", "chat": to_dict(chat)}


@app.get("/offers/{offer_id}/chat")
async def get_messages(offer_id: str, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.offer_id == offer_id).order_by(ChatMessage.timestamp)
    )
    chats = result.scalars().all()
    return {
        "messages": [
            {
                "id": c.id,
                "sender": c.sender,
                "content": c.content,
                "timestamp": c.timestamp.isoformat(),
            }
            for c in chats
        ]
    }


connections = {}  # keep at module level

@app.websocket("/ws/chat/{offer_id}")
async def chat_ws(websocket: WebSocket, offer_id: str, db: AsyncSession = Depends(get_async_db)):
    await websocket.accept()
    connections.setdefault(offer_id, []).append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            print("📥 Received:", data) # 👈 add this line here
            sender = data.get("sender", "anon")
            content = data.get("content", "")

            # ✅ Save asynchronously
            msg = ChatMessage(offer_id=offer_id, sender=sender, content=content)
            db.add(msg)
            await db.commit()
            await db.refresh(msg)

            payload = {
                "id": msg.id,
                "offer_id": offer_id,
                "sender": msg.sender,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
            }

            print("📡 Broadcasting to", len(connections[offer_id]), "connections") # 👈 add here
            # ✅ Broadcast
            for conn in connections[offer_id]:
                await conn.send_text(json.dumps(payload))

    except WebSocketDisconnect:
        connections[offer_id].remove(websocket)
