from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import auth
from schemas import ApplicationCreate

router = APIRouter(prefix="/api/applications", tags=["applications"])

# Hatchet client for triggering tasks
# Set USE_HATCHET=1 to enable async processing
import os
if os.getenv("USE_HATCHET"):
    try:
        from hatchet_sdk import Hatchet
        hatchet = Hatchet()
    except Exception:
        hatchet = None
else:
    hatchet = None


def is_admin(user: models.User) -> bool:
    return user.role == "admin" or user.email == "deepaksilaych@gmail.com"


@router.get("")
def list_applications(
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Application).filter(
        models.Application.user_id == current_user.id
    ).order_by(models.Application.created_at.desc()).all()


@router.post("")
def create_application(
    app_data: ApplicationCreate,
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_app = models.Application(**app_data.model_dump(), user_id=current_user.id)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@router.get("/{app_id}")
def get_application(
    app_id: int,
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if is_admin(current_user):
        app = db.query(models.Application).filter(models.Application.id == app_id).first()
    else:
        app = db.query(models.Application).filter(
            models.Application.id == app_id,
            models.Application.user_id == current_user.id
        ).first()
    if not app:
        raise HTTPException(404, "Application not found")
    return app


@router.post("/{app_id}/match")
def run_matching(
    app_id: int,
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Trigger async matching via Hatchet."""
    if is_admin(current_user):
        app = db.query(models.Application).filter(models.Application.id == app_id).first()
    else:
        app = db.query(models.Application).filter(
            models.Application.id == app_id,
            models.Application.user_id == current_user.id
        ).first()
        
    if not app:
        raise HTTPException(404, "Application not found")
    
    app.status = "processing"
    db.commit()
    
    # Trigger async task via Hatchet, or sync fallback
    if hatchet:
        try:
            hatchet.event.push("application:match", {"application_id": app_id})
            return {"status": "processing", "app_id": app_id}
        except Exception as e:
            print(f"Hatchet push failed: {e}, falling back to sync")
    
    # Sync fallback
    import matching
    programs = db.query(models.Program).all()
    results = matching.match_application(app, programs)
    
    # Save results
    db.query(models.MatchResult).filter(models.MatchResult.application_id == app_id).delete()
    for r in results:
        db.add(models.MatchResult(
            application_id=app_id,
            program_id=r["program_id"],
            program_name=r["program_name"],
            is_eligible=r["is_eligible"],
            fit_score=r["fit_score"],
            criteria_results=r["criteria_results"],
            rejection_reasons=r["rejection_reasons"]
        ))
    app.status = "completed"
    db.commit()
    
    return {"status": "completed", "app_id": app_id, "matches": len(results)}


@router.get("/{app_id}/results")
def get_match_results(
    app_id: int,
    db: Session = Depends(models.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if is_admin(current_user):
        app = db.query(models.Application).filter(models.Application.id == app_id).first()
    else:
        app = db.query(models.Application).filter(
            models.Application.id == app_id,
            models.Application.user_id == current_user.id
        ).first()
    if not app:
        raise HTTPException(404, "Application not found")
    
    results = db.query(models.MatchResult).filter(models.MatchResult.application_id == app_id).all()
    output = []
    for r in results:
        output.append({
            "id": r.id,
            "program_id": r.program_id,
            "program_name": r.program_name,
            "is_eligible": r.is_eligible,
            "fit_score": r.fit_score,
            "criteria_results": r.criteria_results,
            "rejection_reasons": r.rejection_reasons
        })
    output.sort(key=lambda x: (x["is_eligible"], x["fit_score"]), reverse=True)
    return output
