"""Programs API endpoints."""
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import models

router = APIRouter(prefix="/api/programs", tags=["programs"])

UPLOAD_DIR = "uploads/pdfs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Hatchet client for triggering workflows
try:
    from hatchet_sdk import Hatchet
    hatchet = Hatchet()
except Exception:
    hatchet = None



class ProgramCreate(BaseModel):
    name: str
    description: Optional[str] = None
    min_fico: Optional[int] = None
    max_fico: Optional[int] = None
    min_fico_no_paynet: Optional[int] = None
    min_paynet: Optional[int] = None
    min_years_in_business: Optional[float] = None
    min_years_no_paynet: Optional[float] = None
    min_revenue: Optional[float] = None
    min_loan_amount: Optional[float] = None
    max_loan_amount: Optional[float] = None
    min_term_months: Optional[int] = None
    max_term_months: Optional[int] = None
    max_bankruptcies: int = 0
    min_bankruptcy_years: Optional[int] = None
    allow_tax_liens: bool = True
    allow_judgments: bool = True
    allow_foreclosures: bool = True
    require_homeownership: bool = False
    require_us_citizen: bool = False
    max_equipment_age_years: Optional[int] = None
    max_soft_cost_percent: Optional[int] = None
    restricted_states: list[str] = []
    restricted_industries: list[str] = []
    allowed_equipment_types: list[str] = []
    excluded_equipment_types: list[str] = []
    industry_loan_limits: dict = {}
    priority: int = 0


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    min_fico: Optional[int] = None
    max_fico: Optional[int] = None
    min_fico_no_paynet: Optional[int] = None
    min_paynet: Optional[int] = None
    min_years_in_business: Optional[float] = None
    min_years_no_paynet: Optional[float] = None
    min_revenue: Optional[float] = None
    min_loan_amount: Optional[float] = None
    max_loan_amount: Optional[float] = None
    min_term_months: Optional[int] = None
    max_term_months: Optional[int] = None
    max_bankruptcies: Optional[int] = None
    min_bankruptcy_years: Optional[int] = None
    allow_tax_liens: Optional[bool] = None
    allow_judgments: Optional[bool] = None
    allow_foreclosures: Optional[bool] = None
    require_homeownership: Optional[bool] = None
    require_us_citizen: Optional[bool] = None
    max_equipment_age_years: Optional[int] = None
    max_soft_cost_percent: Optional[int] = None
    restricted_states: Optional[list[str]] = None
    restricted_industries: Optional[list[str]] = None
    allowed_equipment_types: Optional[list[str]] = None
    excluded_equipment_types: Optional[list[str]] = None
    industry_loan_limits: Optional[dict] = None
    priority: Optional[int] = None


def program_to_dict(p) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "pdf_path": p.pdf_path,
        "min_fico": p.min_fico,
        "max_fico": p.max_fico,
        "min_fico_no_paynet": p.min_fico_no_paynet,
        "min_paynet": p.min_paynet,
        "min_years_in_business": p.min_years_in_business,
        "min_years_no_paynet": p.min_years_no_paynet,
        "min_revenue": p.min_revenue,
        "min_loan_amount": p.min_loan_amount,
        "max_loan_amount": p.max_loan_amount,
        "min_term_months": p.min_term_months,
        "max_term_months": p.max_term_months,
        "max_bankruptcies": p.max_bankruptcies,
        "min_bankruptcy_years": p.min_bankruptcy_years,
        "allow_tax_liens": p.allow_tax_liens,
        "allow_judgments": p.allow_judgments,
        "allow_foreclosures": p.allow_foreclosures,
        "require_homeownership": p.require_homeownership,
        "require_us_citizen": p.require_us_citizen,
        "max_equipment_age_years": p.max_equipment_age_years,
        "max_soft_cost_percent": p.max_soft_cost_percent,
        "restricted_states": p.restricted_states,
        "restricted_industries": p.restricted_industries,
        "allowed_equipment_types": p.allowed_equipment_types,
        "excluded_equipment_types": p.excluded_equipment_types,
        "industry_loan_limits": p.industry_loan_limits,
        "priority": p.priority,
    }


@router.get("")
def list_programs(db: Session = Depends(models.get_db)):
    return [program_to_dict(p) for p in db.query(models.Program).all()]


@router.get("/{program_id}")
def get_program(program_id: int, db: Session = Depends(models.get_db)):
    p = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not p:
        raise HTTPException(404, "Program not found")
    result = program_to_dict(p)
    result["text_preview"] = p.text_preview
    return result


@router.post("")
def create_program(
    program: ProgramCreate,
    db: Session = Depends(models.get_db),
):
    db_program = models.Program(**program.model_dump())
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return program_to_dict(db_program)


@router.put("/{program_id}")
def update_program(
    program_id: int,
    program: ProgramUpdate,
    db: Session = Depends(models.get_db),
):
    db_program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not db_program:
        raise HTTPException(404, "Program not found")
    
    for k, v in program.model_dump(exclude_unset=True).items():
        setattr(db_program, k, v)
    
    db.commit()
    db.refresh(db_program)
    return program_to_dict(db_program)


@router.delete("/{program_id}")
def delete_program(
    program_id: int,
    db: Session = Depends(models.get_db),
):
    db_program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not db_program:
        raise HTTPException(404, "Program not found")
    
    if db_program.pdf_path and os.path.exists(db_program.pdf_path):
        os.remove(db_program.pdf_path)
    
    db.delete(db_program)
    db.commit()
    return {"ok": True}


@router.post("/upload-pdf")
async def upload_and_parse_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(models.get_db),
):
    """Upload PDF and trigger async LLM parsing via Hatchet."""

    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files accepted")
    
    # Save file
    filename = f"{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Handle duplicate filenames
    counter = 1
    while os.path.exists(filepath):
        name, ext = os.path.splitext(file.filename)
        filename = f"{name}_{counter}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        counter += 1
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Create program with unique name
    base_name = os.path.splitext(file.filename)[0]
    name = base_name
    name_counter = 1
    while db.query(models.Program).filter_by(name=name).first():
        name = f"{base_name}_{name_counter}"
        name_counter += 1
    
    db_program = models.Program(
        name=name,
        description="Processing...",
        pdf_path=filepath
    )
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    
    # Try Hatchet workflow, fallback to sync if fails
    if hatchet:
        try:
            hatchet.event.push("program:parse_pdf", {
                "pdf_path": filepath,
                "program_id": db_program.id
            })
            return {
                "status": "processing",
                "message": "PDF uploaded and parsing started",
                "pdf_path": filepath,
                "program_id": db_program.id
            }
        except Exception as e:
            print(f"Hatchet push failed: {e}, falling back to sync")
    
    # Fallback: sync parsing
    from services.pdf_parser import parse_pdf_file
    result = parse_pdf_file(filepath)
    
    if "error" in result:
        return {
            "status": "error",
            "error": result["error"],
            "pdf_path": filepath,
            "program_id": db_program.id
        }
    
    # Update program with parsed data (keep original name)
    for k, v in result.items():
        if k == "name":
            continue
        if hasattr(db_program, k) and v is not None:
            setattr(db_program, k, v)
    db.commit()
    
    return {
        "status": "completed",
        "message": "PDF parsed successfully",
        "pdf_path": filepath,
        "program_id": db_program.id
    }


@router.post("/{program_id}/reparse")
async def reparse_program_pdf(
    program_id: int,
    db: Session = Depends(models.get_db),
):
    """Re-parse an existing program's PDF with LLM."""
    db_program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not db_program:
        raise HTTPException(404, "Program not found")
    
    if not db_program.pdf_path or not os.path.exists(db_program.pdf_path):
        raise HTTPException(400, "No PDF associated with this program")
    
    # Try Hatchet workflow, fallback to sync if fails
    if hatchet:
        try:
            hatchet.event.push("program:parse_pdf", {
                "pdf_path": db_program.pdf_path,
                "program_id": program_id
            })
            return {"status": "processing", "program_id": program_id}
        except Exception as e:
            print(f"Hatchet push failed: {e}, falling back to sync")
    
    # Fallback: sync parsing
    from services.pdf_parser import parse_pdf_file
    result = parse_pdf_file(db_program.pdf_path)
    
    if "error" in result:
        return {"status": "error", "error": result["error"], "program_id": program_id}
    
    for k, v in result.items():
        if k == "name":
            continue
        if hasattr(db_program, k) and v is not None:
            setattr(db_program, k, v)
    db.commit()
    
    return {"status": "completed", "program_id": program_id}
