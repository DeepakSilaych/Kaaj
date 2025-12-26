"""Database models for lender matching platform."""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, JSON, ForeignKey, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# PostgreSQL connection
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/postgres"
)
# Fix postgres:// to postgresql:// (some services use postgres://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String, default="broker")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Program(Base):
    """A financing program with eligibility criteria and PDF source."""
    __tablename__ = "programs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    pdf_path = Column(String, nullable=True)
    
    text_preview = Column(Text, nullable=True)  # First part of PDF text for reference
    
    # Credit criteria
    min_fico = Column(Integer, nullable=True)
    max_fico = Column(Integer, nullable=True)
    min_fico_no_paynet = Column(Integer, nullable=True)  # Higher FICO if no PayNet
    min_paynet = Column(Integer, nullable=True)
    
    # Business criteria
    min_years_in_business = Column(Float, nullable=True)
    min_years_no_paynet = Column(Float, nullable=True)  # Higher TIB if no PayNet
    min_revenue = Column(Float, nullable=True)
    
    # Loan terms
    min_loan_amount = Column(Float, nullable=True)
    max_loan_amount = Column(Float, nullable=True)
    min_term_months = Column(Integer, nullable=True)
    max_term_months = Column(Integer, nullable=True)
    
    # Background checks
    max_bankruptcies = Column(Integer, default=0)
    min_bankruptcy_years = Column(Integer, nullable=True)  # Min years since discharge
    allow_tax_liens = Column(Boolean, default=True)
    allow_judgments = Column(Boolean, default=True)
    allow_foreclosures = Column(Boolean, default=True)
    
    # Applicant requirements
    require_homeownership = Column(Boolean, default=False)
    require_us_citizen = Column(Boolean, default=False)
    
    # Equipment
    max_equipment_age_years = Column(Integer, nullable=True)
    max_soft_cost_percent = Column(Integer, nullable=True)
    
    # Restrictions
    restricted_states = Column(JSON, default=list)
    restricted_industries = Column(JSON, default=list)
    allowed_equipment_types = Column(JSON, default=list)  # Empty = all allowed
    excluded_equipment_types = Column(JSON, default=list)
    
    # Industry-specific loan limits
    industry_loan_limits = Column(JSON, default=dict)  # {"Trucking": 150000}
    
    priority = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Business info
    business_name = Column(String)
    industry = Column(String)
    state = Column(String(2))
    years_in_business = Column(Float)
    annual_revenue = Column(Float)
    
    # Guarantor info
    guarantor_name = Column(String)
    fico_score = Column(Integer)
    paynet_score = Column(Integer, nullable=True)
    is_homeowner = Column(Boolean, default=False)
    is_us_citizen = Column(Boolean, default=True)
    
    # Background
    bankruptcies = Column(Integer, default=0)
    bankruptcy_discharge_years = Column(Integer, nullable=True)  # Years since discharge
    has_tax_liens = Column(Boolean, default=False)
    has_judgments = Column(Boolean, default=False)
    has_foreclosures = Column(Boolean, default=False)
    
    # Loan details
    loan_amount = Column(Float)
    term_months = Column(Integer)
    
    # Equipment
    equipment_type = Column(String)
    equipment_age_years = Column(Float, default=0)
    equipment_description = Column(Text, nullable=True)
    soft_cost_percent = Column(Integer, default=0)
    
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    match_results = relationship("MatchResult", back_populates="application", cascade="all, delete-orphan")


class MatchResult(Base):
    """Result of matching an application against a program."""
    __tablename__ = "match_results"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    program_id = Column(Integer, ForeignKey("programs.id"))
    program_name = Column(String)
    is_eligible = Column(Boolean)
    fit_score = Column(Integer, default=0)
    criteria_results = Column(JSON)
    rejection_reasons = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("Application", back_populates="match_results")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
