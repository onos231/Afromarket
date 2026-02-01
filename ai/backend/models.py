from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from ai.backend.database import Base
from datetime import datetime


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
    status = Column(String)

    # ✅ Use proper DateTime for timestamp
    timestamp = Column(DateTime, default=datetime.utcnow)

    matched_with = Column(String, nullable=True)

    # Swap enforcement
    completion_code = Column(String, nullable=True)
    confirmed_by = Column(String, nullable=True)

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
