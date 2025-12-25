from pydantic import BaseModel
from typing import Optional


class PolicyCreate(BaseModel):
    lender_id: int
    program_name: str
    min_fico: Optional[int] = None
    max_fico: Optional[int] = None
    min_paynet: Optional[int] = None
    min_years_in_business: Optional[float] = None
    min_revenue: Optional[float] = None
    min_loan_amount: Optional[float] = None
    max_loan_amount: Optional[float] = None
    min_term_months: Optional[int] = None
    max_term_months: Optional[int] = None
    restricted_states: list[str] = []
    restricted_industries: list[str] = []
    allowed_equipment_types: list[str] = []
    priority: int = 0


class PolicyUpdate(BaseModel):
    program_name: Optional[str] = None
    min_fico: Optional[int] = None
    max_fico: Optional[int] = None
    min_paynet: Optional[int] = None
    min_years_in_business: Optional[float] = None
    min_revenue: Optional[float] = None
    min_loan_amount: Optional[float] = None
    max_loan_amount: Optional[float] = None
    min_term_months: Optional[int] = None
    max_term_months: Optional[int] = None
    restricted_states: Optional[list[str]] = None
    restricted_industries: Optional[list[str]] = None
    allowed_equipment_types: Optional[list[str]] = None
    priority: Optional[int] = None
    active: Optional[bool] = None

