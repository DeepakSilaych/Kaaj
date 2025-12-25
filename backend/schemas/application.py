from pydantic import BaseModel
from typing import Optional


class ApplicationCreate(BaseModel):
    # Business info
    business_name: str
    industry: str
    state: str
    years_in_business: float
    annual_revenue: float
    
    # Guarantor info
    guarantor_name: str
    fico_score: int
    paynet_score: Optional[int] = None
    is_homeowner: bool = False
    is_us_citizen: bool = True
    
    # Background
    bankruptcies: int = 0
    bankruptcy_discharge_years: Optional[int] = None
    has_tax_liens: bool = False
    has_judgments: bool = False
    has_foreclosures: bool = False
    
    # Loan
    loan_amount: float
    term_months: int
    
    # Equipment
    equipment_type: str
    equipment_age_years: float = 0
    equipment_description: Optional[str] = None
    soft_cost_percent: int = 0
