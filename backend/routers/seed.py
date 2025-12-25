import os
import shutil
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models
import auth
from services.pdf_parser import parse_pdf_file

router = APIRouter(tags=["seed"])

PDF_SOURCE_DIR = os.environ.get("PDF_SOURCE_DIR", "../pdf")  # Source PDFs
UPLOAD_DIR = "uploads/pdfs"  # Where we copy them


@router.post("/api/seed")
def seed_data(force: bool = False, db: Session = Depends(models.get_db)):
    """Seed database by parsing PDFs from the pdf/ folder."""
    
    # Always ensure demo user exists
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
    
    if db.query(models.Program).count() > 0 and not force:
        return {"message": "Already seeded. Use ?force=true to re-seed."}
    
    if force:
        db.query(models.MatchResult).delete()
        db.query(models.Application).delete()
        db.query(models.Program).delete()
        db.commit()
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Find all PDFs in the source directory
    if not os.path.exists(PDF_SOURCE_DIR):
        return {"error": f"PDF source directory '{PDF_SOURCE_DIR}' not found"}
    
    pdf_files = [f for f in os.listdir(PDF_SOURCE_DIR) if f.endswith('.pdf')]
    if not pdf_files:
        return {"error": "No PDF files found in pdf/ folder"}
    
    results = []
    for pdf_file in pdf_files:
        src_path = os.path.join(PDF_SOURCE_DIR, pdf_file)
        dst_path = os.path.join(UPLOAD_DIR, pdf_file)
        
        # Copy PDF to uploads folder
        shutil.copy2(src_path, dst_path)
        
        # Parse with LLM
        try:
            extracted = parse_pdf_file(dst_path)
            
            if "error" in extracted:
                results.append({"file": pdf_file, "status": "error", "error": extracted["error"]})
                continue
            
            # Create program from extracted data
            program = models.Program(
                name=extracted.get("name") or pdf_file.replace(".pdf", ""),
                description=extracted.get("description"),
                pdf_path=dst_path,
                text_preview=extracted.get("text_preview"),
                # Credit
                min_fico=extracted.get("min_fico"),
                max_fico=extracted.get("max_fico"),
                min_fico_no_paynet=extracted.get("min_fico_no_paynet"),
                min_paynet=extracted.get("min_paynet"),
                # Business
                min_years_in_business=extracted.get("min_years_in_business"),
                min_years_no_paynet=extracted.get("min_years_no_paynet"),
                min_revenue=extracted.get("min_revenue"),
                # Loan
                min_loan_amount=extracted.get("min_loan_amount"),
                max_loan_amount=extracted.get("max_loan_amount"),
                max_term_months=extracted.get("max_term_months"),
                # Background
                max_bankruptcies=extracted.get("max_bankruptcies", 0),
                min_bankruptcy_years=extracted.get("min_bankruptcy_years"),
                allow_tax_liens=extracted.get("allow_tax_liens", True),
                allow_judgments=extracted.get("allow_judgments", True),
                allow_foreclosures=extracted.get("allow_foreclosures", True),
                # Requirements
                require_homeownership=extracted.get("require_homeownership", False),
                require_us_citizen=extracted.get("require_us_citizen", False),
                # Equipment
                max_equipment_age_years=extracted.get("max_equipment_age_years"),
                max_soft_cost_percent=extracted.get("max_soft_cost_percent"),
                # Restrictions
                restricted_states=extracted.get("restricted_states", []),
                restricted_industries=extracted.get("restricted_industries", []),
                allowed_equipment_types=extracted.get("allowed_equipment_types", []),
                excluded_equipment_types=extracted.get("excluded_equipment_types", []),
                industry_loan_limits=extracted.get("industry_loan_limits", {}),
                priority=extracted.get("priority", 1),
            )
            db.add(program)
            db.commit()
            db.refresh(program)
            
            results.append({
                "file": pdf_file, 
                "status": "ok", 
                "program_id": program.id,
                "name": program.name
            })
            
        except Exception as e:
            results.append({"file": pdf_file, "status": "error", "error": str(e)})
    
    success_count = len([r for r in results if r["status"] == "ok"])
    return {
        "message": f"Parsed {success_count}/{len(pdf_files)} PDFs",
        "results": results
    }
