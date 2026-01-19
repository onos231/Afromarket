from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from backend.database import SessionLocal, engine
from backend.models import Offer, Base
from backend.auth import router as auth_router, get_current_user

# ✅ Create tables once
Base.metadata.create_all(bind=engine)

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

# FastAPI app
app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include authentication routes
app.include_router(auth_router, prefix="/auth")

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

# ✅ Create an offer
@app.post("/offers")
def create_offer(
    offer: OfferCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        timestamp=datetime.utcnow().isoformat(),
    )

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
def list_offers(db: Session = Depends(get_db)):
    all_offers = db.query(Offer).all()
    return {
        "offers": [
            {**to_dict(o), "badge": badge_for_status(o.status)}
            for o in all_offers
        ]
    }

# ✅ List MY offers (personal dashboard)
@app.get("/offers/my")
def list_my_offers(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_offers = db.query(Offer).filter(Offer.have_owner == current_user).all()
    return {
        "offers": [
            {**to_dict(o), "badge": badge_for_status(o.status)}
            for o in user_offers
        ]
    }

# ✅ Get active offers (pending + matched) for current user
@app.get("/offers/active")
def list_active_offers(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_offers = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status.in_(["pending", "matched"])
    ).all()
    return {
        "active_offers": [
            {**to_dict(o), "badge": badge_for_status(o.status)}
            for o in active_offers
        ]
    }

# ✅ Get offer history (completed or declined) for current user
@app.get("/offers/history")
def offer_history(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    past_offers = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status.in_(["completed", "declined"])
    ).all()
    return {
        "history": [
            {**to_dict(o), "badge": badge_for_status(o.status)}
            for o in past_offers
        ]
    }

# ✅ Get only matched offers (your side only)
@app.get("/offers/matches")
def list_matched_offers(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matched_offers = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status == "matched"
    ).all()
    return {
        "matches": [
            {**to_dict(o), "badge": badge_for_status(o.status)}
            for o in matched_offers
        ]
    }

# ✅ Get matched offers with both sides
@app.get("/offers/matches/full")
def list_full_matches(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matched_offers = db.query(Offer).filter(
        Offer.have_owner == current_user,
        Offer.status == "matched"
    ).all()

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
    return {"matches": results}

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
    return {**to_dict(offer), "badge": badge_for_status(offer.status)}
