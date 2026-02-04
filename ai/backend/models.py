from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from ai.backend.database import Base
from datetime import datetime
import json


class User(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    password = Column(String)


class Offer(Base):
    __tablename__ = "offers"

    # Primary key
    id = Column(String, primary_key=True, index=True)

    # Have item details
    have_name = Column(String)
    have_quantity = Column(String)
    have_category = Column(String)
    have_image = Column(String, nullable=True)
    have_owner = Column(String)

    # Want item details
    want_name = Column(String)
    want_quantity = Column(String)
    want_category = Column(String)
    want_image = Column(String, nullable=True)
    want_owner = Column(String)

    # General offer info
    location = Column(String)
    message = Column(Text, nullable=True)

    # Status tracking
    status = Column(String, default="pending")

    # ✅ Proper DateTime for timestamp
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Matching and confirmation details
    matched_with = Column(String, nullable=True)
    completion_code = Column(String, nullable=True)
    confirmation_code = Column(String, nullable=True)
    confirmed_by = Column(String, nullable=True)

    # ✅ Decline tracking (store as JSON string in SQLite)
    declined_with = Column(Text, default="[]")

    # --- Helper methods ---
    def get_declined_with(self):
        try:
            return json.loads(self.declined_with)
        except Exception:
            return []

    def add_declined_with(self, other_id: str):
        declined = self.get_declined_with()
        if other_id not in declined:
            declined.append(other_id)
        self.declined_with = json.dumps(declined)


    # 👇 Relationship to chat messages
    chats = relationship("ChatMessage", back_populates="offer", cascade="all, delete-orphan")

    def __repr__(self):
        return (
            f"<Offer(id={self.id}, have={self.have_quantity} {self.have_name}, "
            f"want={self.want_quantity} {self.want_name}, status={self.status})>"
        )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(String, ForeignKey("offers.id"), index=True)
    sender = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    # ✅ Ensure timestamp is auto‑set
    timestamp = Column(DateTime, default=datetime.utcnow)

    # 👇 Relationship back to offer
    offer = relationship("Offer", back_populates="chats")

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, sender={self.sender}, content={self.content[:20]}...)>"
