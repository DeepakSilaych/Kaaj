from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models
import auth

router = APIRouter(tags=["seed"])


@router.post("/api/seed")
def seed_data(db: Session = Depends(models.get_db)):
    """Create demo user if not exists."""
    
    # Ensure demo user exists
    demo_user = db.query(models.User).filter(models.User.email == "demo@kaaj.io").first()
    if not demo_user:
        demo_user = models.User(
            email="demo@kaaj.io",
            hashed_password=auth.get_password_hash("demo123"),
            name="Demo User",
            role="broker"
        )
        db.add(demo_user)
        db.commit()
        return {"message": "Demo user created", "email": "demo@kaaj.io", "password": "demo123"}
    
    return {"message": "Demo user already exists", "email": "demo@kaaj.io", "password": "demo123"}
