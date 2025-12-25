from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/applications")
def list_all_applications(db: Session = Depends(models.get_db)):
    # Admin access is gated by password in frontend
    return db.query(models.Application).order_by(models.Application.created_at.desc()).all()

