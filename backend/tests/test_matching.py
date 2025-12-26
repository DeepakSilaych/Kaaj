"""Tests for matching engine."""
import pytest
import sys
sys.path.insert(0, '..')

from matching import match_application, check_fico, check_years_in_business, check_loan_amount, check_state


class MockProgram:
    """Mock program for testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.name = kwargs.get('name', 'Test Program')
        self.min_fico = kwargs.get('min_fico')
        self.max_fico = kwargs.get('max_fico')
        self.min_fico_no_paynet = kwargs.get('min_fico_no_paynet')
        self.min_paynet = kwargs.get('min_paynet')
        self.min_years_in_business = kwargs.get('min_years_in_business')
        self.min_years_no_paynet = kwargs.get('min_years_no_paynet')
        self.min_revenue = kwargs.get('min_revenue')
        self.min_loan_amount = kwargs.get('min_loan_amount')
        self.max_loan_amount = kwargs.get('max_loan_amount')
        self.min_term_months = kwargs.get('min_term_months')
        self.max_term_months = kwargs.get('max_term_months')
        self.restricted_states = kwargs.get('restricted_states', [])
        self.restricted_industries = kwargs.get('restricted_industries', [])
        self.max_bankruptcies = kwargs.get('max_bankruptcies', 0)
        self.min_bankruptcy_years = kwargs.get('min_bankruptcy_years')
        self.allow_tax_liens = kwargs.get('allow_tax_liens', True)
        self.allow_judgments = kwargs.get('allow_judgments', True)
        self.allow_foreclosures = kwargs.get('allow_foreclosures', True)
        self.require_homeownership = kwargs.get('require_homeownership', False)
        self.require_us_citizen = kwargs.get('require_us_citizen', False)
        self.max_equipment_age_years = kwargs.get('max_equipment_age_years')
        self.max_soft_cost_percent = kwargs.get('max_soft_cost_percent')
        self.allowed_equipment_types = kwargs.get('allowed_equipment_types', [])
        self.excluded_equipment_types = kwargs.get('excluded_equipment_types', [])
        self.industry_loan_limits = kwargs.get('industry_loan_limits', {})


class MockApplication:
    """Mock application for testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.fico_score = kwargs.get('fico_score', 700)
        self.paynet_score = kwargs.get('paynet_score')
        self.years_in_business = kwargs.get('years_in_business', 3)
        self.annual_revenue = kwargs.get('annual_revenue', 500000)
        self.loan_amount = kwargs.get('loan_amount', 50000)
        self.term_months = kwargs.get('term_months', 36)
        self.state = kwargs.get('state', 'TX')
        self.industry = kwargs.get('industry', 'Construction')
        self.equipment_type = kwargs.get('equipment_type', 'Equipment')
        self.equipment_age_years = kwargs.get('equipment_age_years', 2)
        self.soft_cost_percent = kwargs.get('soft_cost_percent', 0)
        self.bankruptcies = kwargs.get('bankruptcies', 0)
        self.bankruptcy_discharge_years = kwargs.get('bankruptcy_discharge_years')
        self.has_tax_liens = kwargs.get('has_tax_liens', False)
        self.has_judgments = kwargs.get('has_judgments', False)
        self.has_foreclosures = kwargs.get('has_foreclosures', False)
        self.is_homeowner = kwargs.get('is_homeowner', False)
        self.is_us_citizen = kwargs.get('is_us_citizen', True)


# === FICO Score Tests ===

def test_fico_passes_when_above_minimum():
    app = MockApplication(fico_score=720)
    program = MockProgram(min_fico=650)
    result = check_fico(app, program)
    assert result.passed is True
    assert '720' in result.reason


def test_fico_fails_when_below_minimum():
    app = MockApplication(fico_score=600)
    program = MockProgram(min_fico=650)
    result = check_fico(app, program)
    assert result.passed is False
    assert '600' in result.reason


def test_fico_passes_when_no_requirement():
    app = MockApplication(fico_score=550)
    program = MockProgram(min_fico=None)
    result = check_fico(app, program)
    assert result.passed is True


# === Years in Business Tests ===

def test_years_passes_when_above_minimum():
    app = MockApplication(years_in_business=5)
    program = MockProgram(min_years_in_business=2)
    result = check_years_in_business(app, program)
    assert result.passed is True


def test_years_fails_when_below_minimum():
    app = MockApplication(years_in_business=1)
    program = MockProgram(min_years_in_business=3)
    result = check_years_in_business(app, program)
    assert result.passed is False


def test_years_passes_when_no_requirement():
    app = MockApplication(years_in_business=0.5)
    program = MockProgram(min_years_in_business=None)
    result = check_years_in_business(app, program)
    assert result.passed is True


# === Loan Amount Tests ===

def test_loan_amount_passes_within_range():
    app = MockApplication(loan_amount=50000)
    program = MockProgram(min_loan_amount=10000, max_loan_amount=100000)
    result = check_loan_amount(app, program)
    assert result.passed is True


def test_loan_amount_fails_below_minimum():
    app = MockApplication(loan_amount=5000)
    program = MockProgram(min_loan_amount=10000, max_loan_amount=100000)
    result = check_loan_amount(app, program)
    assert result.passed is False


def test_loan_amount_fails_above_maximum():
    app = MockApplication(loan_amount=150000)
    program = MockProgram(min_loan_amount=10000, max_loan_amount=100000)
    result = check_loan_amount(app, program)
    assert result.passed is False


# === State Restriction Tests ===

def test_state_passes_when_not_restricted():
    app = MockApplication(state='TX')
    program = MockProgram(restricted_states=['CA', 'NY'])
    result = check_state(app, program)
    assert result.passed is True


def test_state_fails_when_restricted():
    app = MockApplication(state='CA')
    program = MockProgram(restricted_states=['CA', 'NY'])
    result = check_state(app, program)
    assert result.passed is False


def test_state_passes_when_no_restrictions():
    app = MockApplication(state='CA')
    program = MockProgram(restricted_states=[])
    result = check_state(app, program)
    assert result.passed is True


# === Full Matching Tests ===

def test_match_eligible_application():
    """Test that a good application matches eligible programs."""
    app = MockApplication(fico_score=750, years_in_business=5, loan_amount=50000)
    program = MockProgram(min_fico=650, min_years_in_business=2, min_loan_amount=10000, max_loan_amount=100000)
    
    results = match_application(app, [program])
    
    assert len(results) == 1
    assert results[0]['is_eligible'] is True
    assert results[0]['fit_score'] > 80


def test_match_ineligible_low_fico():
    """Test that low FICO makes application ineligible."""
    app = MockApplication(fico_score=550, years_in_business=5, loan_amount=50000)
    program = MockProgram(min_fico=650, min_years_in_business=2, min_loan_amount=10000, max_loan_amount=100000)
    
    results = match_application(app, [program])
    
    assert len(results) == 1
    assert results[0]['is_eligible'] is False
    assert len(results[0]['rejection_reasons']) > 0


def test_match_ineligible_restricted_state():
    """Test that restricted state makes application ineligible."""
    app = MockApplication(fico_score=750, state='CA')
    program = MockProgram(min_fico=650, restricted_states=['CA', 'NY'])
    
    results = match_application(app, [program])
    
    assert len(results) == 1
    assert results[0]['is_eligible'] is False


def test_match_multiple_programs():
    """Test matching against multiple programs."""
    app = MockApplication(fico_score=700, years_in_business=3, loan_amount=50000)
    
    programs = [
        MockProgram(id=1, name='Easy', min_fico=600, min_loan_amount=10000, max_loan_amount=100000),
        MockProgram(id=2, name='Hard', min_fico=750, min_loan_amount=10000, max_loan_amount=100000),
        MockProgram(id=3, name='Medium', min_fico=680, min_loan_amount=10000, max_loan_amount=100000),
    ]
    
    results = match_application(app, programs)
    
    assert len(results) == 3
    eligible = [r for r in results if r['is_eligible']]
    assert len(eligible) == 2  # Easy and Medium should match


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
