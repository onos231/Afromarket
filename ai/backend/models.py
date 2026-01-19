from sqlalchemy import Column, String, Text
from backend.database import Base

class Offer(Base):
    __tablename__ = "offers"

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
    message = Column(Text, nullable=True)   # ✅ Text now imported
    status = Column(String)
    timestamp = Column(String)
    matched_with = Column(String, nullable=True)
