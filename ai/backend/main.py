from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
import sqlalchemy
from sqlalchemy.orm import Session   # 👈 this fixes the NameError
import uuid
from datetime import datetime

from typing import Optional          # 👈 needed for Optional fields
from pydantic import BaseModel       # 👈 needed for Pydantic schemas

from ai.backend.database import SessionLocal, engine, Base
from ai.backend.models import Offer
from ai.backend.auth import router as auth_router, get_current_user



logging.basicConfig(level=logging.DEBUG)

# ✅ Create tables once
Base.metadata.create_all(bind=engine)

print("SQLAlchemy version:", sqlalchemy.__version__)
with engine.connect() as conn:
    tables = conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
    print("Tables created:", tables)

app = FastAPI()

# ✅ Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"] for your Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],  # allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # allow Authorization, Content-Type, etc.
)


app.include_router(auth_router)  # no prefix here

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
