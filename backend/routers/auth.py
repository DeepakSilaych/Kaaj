from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import auth as auth_utils
from schemas import UserCreate, UserResponse, Token, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(models.get_db)):
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = models.User(
        email=user_data.email,
        hashed_password=auth_utils.get_password_hash(user_data.password),
        name=user_data.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = auth_utils.create_access_token(data={"sub": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)
    )


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(models.get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth_utils.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = auth_utils.create_access_token(data={"sub": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role
    )

