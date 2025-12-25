from pydantic import BaseModel
from typing import Optional

class ProgramCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pdf_path: Optional[str] = None
    # Credit
    min_fico: Optional[int] = None
    min_fico_no_paynet: Optional[int] = None
    min_paynet: Optional[int] = None
    # Business
    min_years_in_business: Optional[float] = None
    min_years_no_paynet: Optional[float] = None
    min_revenue: Optional[float] = None
    # Loan
    min_loan_amount: Optional[float] = None
    max_loan_amount: Optional[float] = None
    max_term_months: Optional[int] = None
    # Background
    max_bankruptcies: int = 0
    min_bankruptcy_years: Optional[int] = None
    allow_tax_liens: bool = True
    allow_judgments: bool = True
    allow_foreclosures: bool = True
    # Requirements
    require_homeownership: bool = False
    require_us_citizen: bool = False
    # Equipment
    max_equipment_age_years: Optional[int] = None
    max_soft_cost_percent: Optional[int] = None
    # Restrictions
    restricted_states: list[str] = []
    restricted_industries: list[str] = []
    allowed_equipment_types: list[str] = []
    excluded_equipment_types: list[str] = []
    industry_loan_limits: dict = {}
    priority: int = 0
    active: bool = True


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pdf_path: Optional[str] = None
    min_fico: Optional[int] = None
    min_fico_no_paynet: Optional[int] = None
    min_paynet: Optional[int] = None
    min_years_in_business: Optional[float] = None
    min_years_no_paynet: Optional[float] = None
    min_revenue: Optional[float] = None
    min_loan_amount: Optional[float] = None
    max_loan_amount: Optional[float] = None
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
    active: Optional[bool] = None

