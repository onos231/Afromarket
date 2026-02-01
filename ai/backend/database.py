from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- existing sync setup ---
SQLALCHEMY_DATABASE_URL = "sqlite:////Users/wolf-wernerleibling/Documents/Afromarket/ai/afromarket.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 👇 Dependency for FastAPI sync routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 👇 Explicit init function to ensure tables are created after models are imported
def init_db():
    import ai.backend.models  # make sure all models are registered
    Base.metadata.create_all(bind=engine)


# --- NEW async setup ---
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

ASYNC_SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:////Users/wolf-wernerleibling/Documents/Afromarket/ai/afromarket.db"

async_engine = create_async_engine(ASYNC_SQLALCHEMY_DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(
    async_engine, expire_on_commit=False, class_=AsyncSession
)

# 👇 Dependency for FastAPI async routes
async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
