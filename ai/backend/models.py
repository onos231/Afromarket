from sqlalchemy import Column, String, Text
from ai.backend.database import Base

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
    timestamp = Column(String)
    matched_with = Column(String, nullable=True)

    # Swap enforcement
    completion_code = Column(String, nullable=True)
    confirmed_by = Column(String, nullable=True)

    def __repr__(self):
        return (
            f"<Offer(id={self.id}, have={self.have_quantity} {self.have_name}, "
            f"want={self.want_quantity} {self.want_name}, status={self.status})>"
        )
