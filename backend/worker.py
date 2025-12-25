"""Hatchet worker for async workflows: matching & PDF parsing."""
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

load_dotenv()

from hatchet_sdk import Hatchet, Context
import models
import matching
from services.pdf_parser import parse_pdf_file

# Initialize database tables
models.init_db()

hatchet = Hatchet()


# ============= Application Matching Workflow =============

class MatchInput(BaseModel):
    application_id: int


@hatchet.task(name="match_application", on_events=["application:match"], retries=3, input_validator=MatchInput)
def match_application_task(input: MatchInput, ctx: Context) -> dict:
    """Match application against all active programs."""
    app_id = input.application_id
    ctx.log(f"Starting match for application {app_id}")
    
    db = next(models.get_db())
    try:
        app = db.query(models.Application).filter_by(id=app_id).first()
        ctx.log(f"Found application: {app is not None}")
        if not app:
            return {"error": f"Application {app_id} not found"}
        
        app.status = "processing"
        db.commit()
        
        # Clear old results
        db.query(models.MatchResult).filter_by(application_id=app_id).delete()
        db.commit()
        
        # Load all programs
        programs = db.query(models.Program).all()
        ctx.log(f"Found {len(programs)} programs")
        
        # Run matching
        ctx.log("Running matching...")
        results = matching.match_application(app, programs)
        ctx.log(f"Matching complete: {len(results)} results")
        
        # Save results
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
        
        eligible = len([r for r in results if r["is_eligible"]])
        return {"app_id": app_id, "total": len(results), "eligible": eligible}
    finally:
        db.close()


# ============= PDF Parsing Workflow =============

class ParsePdfInput(BaseModel):
    pdf_path: str
    program_id: Optional[int] = None  # If updating existing program


@hatchet.task(name="parse_pdf", on_events=["program:parse_pdf"], retries=2, input_validator=ParsePdfInput)
def parse_pdf_task(input: ParsePdfInput, ctx: Context) -> dict:
    """Parse PDF using LLM and create/update program."""
    pdf_path = input.pdf_path
    program_id = input.program_id
    
    ctx.log(f"Parsing PDF: {pdf_path}")
    
    # Parse with LLM
    try:
        extracted = parse_pdf_file(pdf_path)
    except Exception as e:
        return {"error": f"PDF parsing failed: {e}"}
    
    if "error" in extracted:
        return {"error": extracted["error"], "raw": extracted.get("raw_response")}
    
    db = next(models.get_db())
    try:
        # Build program data from extracted fields
        program_data = {
            "name": extracted.get("name", os.path.basename(pdf_path).replace(".pdf", "")),
            "description": extracted.get("description"),
            "pdf_path": pdf_path,
            "text_preview": extracted.get("text_preview"),
            # Credit
            "min_fico": extracted.get("min_fico"),
            "max_fico": extracted.get("max_fico"),
            "min_fico_no_paynet": extracted.get("min_fico_no_paynet"),
            "min_paynet": extracted.get("min_paynet"),
            # Business
            "min_years_in_business": extracted.get("min_years_in_business"),
            "min_years_no_paynet": extracted.get("min_years_no_paynet"),
            "min_revenue": extracted.get("min_revenue"),
            # Loan
            "min_loan_amount": extracted.get("min_loan_amount"),
            "max_loan_amount": extracted.get("max_loan_amount"),
            "max_term_months": extracted.get("max_term_months"),
            # Background
            "max_bankruptcies": extracted.get("max_bankruptcies", 0),
            "min_bankruptcy_years": extracted.get("min_bankruptcy_years"),
            "allow_tax_liens": extracted.get("allow_tax_liens", True),
            "allow_judgments": extracted.get("allow_judgments", True),
            "allow_foreclosures": extracted.get("allow_foreclosures", True),
            # Requirements
            "require_homeownership": extracted.get("require_homeownership", False),
            "require_us_citizen": extracted.get("require_us_citizen", False),
            # Equipment
            "max_equipment_age_years": extracted.get("max_equipment_age_years"),
            "max_soft_cost_percent": extracted.get("max_soft_cost_percent"),
            # Restrictions
            "restricted_states": extracted.get("restricted_states", []),
            "restricted_industries": extracted.get("restricted_industries", []),
            "allowed_equipment_types": extracted.get("allowed_equipment_types", []),
            "excluded_equipment_types": extracted.get("excluded_equipment_types", []),
            "industry_loan_limits": extracted.get("industry_loan_limits", {}),
            # Priority
            "priority": extracted.get("priority", 1),
        }
        
        if program_id:
            # Update existing program (keep original name)
            program = db.query(models.Program).filter_by(id=program_id).first()
            if program:
                for k, v in program_data.items():
                    if k == "name":  # Don't overwrite name
                        continue
                    if v is not None:
                        setattr(program, k, v)
                db.commit()
                ctx.log(f"Updated program {program_id}")
                return {"program_id": program_id, "status": "updated", "confidence": extracted.get("confidence_score")}
        
        # Create new program
        # Check for duplicate name
        existing = db.query(models.Program).filter_by(name=program_data["name"]).first()
        if existing:
            program_data["name"] = f"{program_data['name']} (new)"
        
        program = models.Program(**program_data)
        db.add(program)
        db.commit()
        db.refresh(program)
        
        ctx.log(f"Created program {program.id}: {program.name}")
        return {
            "program_id": program.id,
            "name": program.name,
            "status": "created",
            "confidence": extracted.get("confidence_score")
        }
    finally:
        db.close()


def main():
    print("Starting Hatchet worker...")
    print("Registered workflows: match_application, parse_pdf")
    worker = hatchet.worker("lender-match-worker")
    worker.register_workflow(match_application_task)
    worker.register_workflow(parse_pdf_task)
    worker.start()


if __name__ == "__main__":
    main()
