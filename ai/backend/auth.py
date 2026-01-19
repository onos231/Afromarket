from fastapi import Depends, HTTPException, APIRouter
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import sqlite3

security = HTTPBearer()

# ✅ Use Argon2 only (no bcrypt at all)
pwd_context = CryptContext(
    schemes=["argon2"],
    default="argon2",
    deprecated="auto"
)

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

# --- Database setup ---
def get_db():
    conn = sqlite3.connect("users.db")
    conn.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT)")
    return conn

# --- Models ---
class SignupRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

# --- Helpers ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)

def create_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    if "sub" not in to_encode:
        raise ValueError("Token payload must include 'sub'")
    to_encode.update({"exp": datetime.utcnow() + expires_delta})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# ✅ Define router
router = APIRouter(prefix="/auth", tags=["auth"])

# --- Routes ---
@router.post("/signup")
def signup(request: SignupRequest):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username=?", (request.username,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Username already exists")
    cur.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                (request.username, hash_password(request.password)))
    conn.commit()
    conn.close()
    return {"message": "User created successfully"}

@router.post("/login")
def login(request: LoginRequest):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT password FROM users WHERE username=?", (request.username,))
    row = cur.fetchone()
    conn.close()

    if not row or not verify_password(request.password, row[0]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = create_token({"sub": request.username}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_token({"sub": request.username}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
