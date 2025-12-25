"""Matching engine - evaluates applications against program criteria."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class CriteriaResult:
    field: str
    passed: bool
    reason: str
    weight: int = 10


def check_fico(app, program) -> CriteriaResult:
    """Check FICO score - uses higher threshold if no PayNet provided."""
    app_fico = app.fico_score
    has_paynet = app.paynet_score is not None
    
    # Use higher FICO requirement if no PayNet and program specifies it
    min_fico = program.min_fico
    if not has_paynet and program.min_fico_no_paynet:
        min_fico = program.min_fico_no_paynet
    
    if min_fico and app_fico < min_fico:
        gap = min_fico - app_fico
        note = " (higher requirement due to no PayNet)" if not has_paynet and program.min_fico_no_paynet else ""
        return CriteriaResult(
            "fico_score", False,
            f"FICO {app_fico} is {gap} points below minimum {min_fico}{note}. Need {gap}+ point improvement.",
            25
        )
    if program.max_fico and app_fico > program.max_fico:
        return CriteriaResult("fico_score", False, f"FICO {app_fico} exceeds max {program.max_fico}.", 25)
    
    if min_fico:
        margin = app_fico - min_fico
        return CriteriaResult("fico_score", True, f"FICO {app_fico} meets minimum {min_fico} (+{margin})", 25)
    return CriteriaResult("fico_score", True, f"FICO {app_fico} accepted", 25)


def check_paynet(app, program) -> CriteriaResult:
    if not program.min_paynet:
        return CriteriaResult("paynet_score", True, "No PayNet requirement", 15)
    if not app.paynet_score:
        return CriteriaResult(
            "paynet_score", False,
            f"PayNet score required (minimum {program.min_paynet}). Business credit report needed.",
            15
        )
    if app.paynet_score < program.min_paynet:
        gap = program.min_paynet - app.paynet_score
        return CriteriaResult(
            "paynet_score", False,
            f"PayNet {app.paynet_score} is {gap} below minimum {program.min_paynet}.",
            15
        )
    margin = app.paynet_score - program.min_paynet
    return CriteriaResult("paynet_score", True, f"PayNet {app.paynet_score} meets minimum (+{margin})", 15)


def check_years_in_business(app, program) -> CriteriaResult:
    has_paynet = app.paynet_score is not None
    min_years = program.min_years_in_business
    
    # Higher TIB if no PayNet
    if not has_paynet and program.min_years_no_paynet:
        min_years = program.min_years_no_paynet
    
    if not min_years:
        return CriteriaResult("years_in_business", True, "No TIB requirement", 15)
    if app.years_in_business < min_years:
        gap = min_years - app.years_in_business
        months = int(gap * 12)
        note = " (higher due to no PayNet)" if not has_paynet and program.min_years_no_paynet else ""
        return CriteriaResult(
            "years_in_business", False,
            f"{app.years_in_business:.1f} years is below {min_years:.0f} year minimum{note}. Need ~{months} more months.",
            15
        )
    return CriteriaResult("years_in_business", True, f"{app.years_in_business:.1f} years meets {min_years:.0f} year minimum", 15)


def check_revenue(app, program) -> CriteriaResult:
    if not program.min_revenue:
        return CriteriaResult("annual_revenue", True, "No revenue requirement", 10)
    if app.annual_revenue < program.min_revenue:
        gap = program.min_revenue - app.annual_revenue
        pct = (gap / program.min_revenue) * 100
        return CriteriaResult(
            "annual_revenue", False,
            f"Revenue ${app.annual_revenue:,.0f} is ${gap:,.0f} short of ${program.min_revenue:,.0f} minimum ({pct:.0f}% below).",
            10
        )
    return CriteriaResult("annual_revenue", True, f"Revenue ${app.annual_revenue:,.0f} meets minimum", 10)


def check_loan_amount(app, program) -> CriteriaResult:
    amount = app.loan_amount
    
    # Check industry-specific limits
    if program.industry_loan_limits:
        for ind, limit in program.industry_loan_limits.items():
            if ind.lower() in app.industry.lower() or app.industry.lower() in ind.lower():
                if amount > limit:
                    return CriteriaResult(
                        "loan_amount", False,
                        f"${amount:,.0f} exceeds ${limit:,.0f} limit for {ind} industry.",
                        15
                    )
    
    if program.min_loan_amount and amount < program.min_loan_amount:
        return CriteriaResult(
            "loan_amount", False,
            f"${amount:,.0f} below minimum ${program.min_loan_amount:,.0f}. Program requires higher loan amounts.",
            15
        )
    if program.max_loan_amount and amount > program.max_loan_amount:
        excess = amount - program.max_loan_amount
        return CriteriaResult(
            "loan_amount", False,
            f"${amount:,.0f} exceeds maximum ${program.max_loan_amount:,.0f} by ${excess:,.0f}.",
            15
        )
    return CriteriaResult("loan_amount", True, f"Loan amount ${amount:,.0f} approved", 15)


def check_term(app, program) -> CriteriaResult:
    term = app.term_months
    if program.min_term_months and term < program.min_term_months:
        return CriteriaResult("term_months", False, f"{term} months below minimum {program.min_term_months}.", 5)
    if program.max_term_months and term > program.max_term_months:
        return CriteriaResult("term_months", False, f"{term} months exceeds maximum {program.max_term_months}.", 5)
    return CriteriaResult("term_months", True, f"{term} month term accepted", 5)


def check_state(app, program) -> CriteriaResult:
    if app.state in (program.restricted_states or []):
        return CriteriaResult(
            "state", False,
            f"State {app.state} restricted. Not available: {', '.join(program.restricted_states)}.",
            10
        )
    return CriteriaResult("state", True, f"State {app.state} eligible", 10)


def check_industry(app, program) -> CriteriaResult:
    industry = app.industry.lower()
    for restricted in (program.restricted_industries or []):
        if restricted.lower() in industry or industry in restricted.lower():
            return CriteriaResult(
                "industry", False,
                f"Industry '{app.industry}' restricted by this program.",
                10
            )
    return CriteriaResult("industry", True, f"Industry '{app.industry}' eligible", 10)


def check_equipment_type(app, program) -> CriteriaResult:
    equip = app.equipment_type.lower()
    
    # Check excluded types first
    for excluded in (program.excluded_equipment_types or []):
        if excluded.lower() in equip or equip in excluded.lower():
            return CriteriaResult(
                "equipment_type", False,
                f"Equipment '{app.equipment_type}' excluded. Not allowed: {', '.join(program.excluded_equipment_types)}.",
                5
            )
    
    # Check allowed types if specified
    if program.allowed_equipment_types:
        for allowed in program.allowed_equipment_types:
            if allowed.lower() in equip or equip in allowed.lower():
                return CriteriaResult("equipment_type", True, f"Equipment '{app.equipment_type}' approved", 5)
        return CriteriaResult(
            "equipment_type", False,
            f"Equipment '{app.equipment_type}' not in approved list: {', '.join(program.allowed_equipment_types)}.",
            5
        )
    
    return CriteriaResult("equipment_type", True, f"Equipment '{app.equipment_type}' accepted", 5)


def check_equipment_age(app, program) -> CriteriaResult:
    if not program.max_equipment_age_years:
        return CriteriaResult("equipment_age", True, "No equipment age restriction", 5)
    if app.equipment_age_years > program.max_equipment_age_years:
        return CriteriaResult(
            "equipment_age", False,
            f"Equipment age {app.equipment_age_years:.0f} years exceeds {program.max_equipment_age_years} year maximum.",
            5
        )
    return CriteriaResult("equipment_age", True, f"Equipment age {app.equipment_age_years:.0f} years accepted", 5)


def check_bankruptcies(app, program) -> CriteriaResult:
    if app.bankruptcies > (program.max_bankruptcies or 0):
        return CriteriaResult(
            "bankruptcies", False,
            f"{app.bankruptcies} bankruptcies exceeds maximum of {program.max_bankruptcies}.",
            10
        )
    if program.min_bankruptcy_years and app.bankruptcies > 0:
        if not app.bankruptcy_discharge_years or app.bankruptcy_discharge_years < program.min_bankruptcy_years:
            years = app.bankruptcy_discharge_years or 0
            return CriteriaResult(
                "bankruptcies", False,
                f"Bankruptcy discharged {years} years ago, requires {program.min_bankruptcy_years}+ years.",
                10
            )
    return CriteriaResult("bankruptcies", True, "Bankruptcy check passed", 10)


def check_tax_liens(app, program) -> CriteriaResult:
    if app.has_tax_liens and not program.allow_tax_liens:
        return CriteriaResult("tax_liens", False, "Tax liens not allowed by this program.", 8)
    return CriteriaResult("tax_liens", True, "No tax lien issues", 8)


def check_judgments(app, program) -> CriteriaResult:
    if app.has_judgments and not program.allow_judgments:
        return CriteriaResult("judgments", False, "Judgments not allowed by this program.", 8)
    return CriteriaResult("judgments", True, "No judgment issues", 8)


def check_homeownership(app, program) -> CriteriaResult:
    if program.require_homeownership and not app.is_homeowner:
        return CriteriaResult("homeownership", False, "Homeownership required for this program.", 5)
    return CriteriaResult("homeownership", True, "Homeownership check passed", 5)


def check_citizenship(app, program) -> CriteriaResult:
    if program.require_us_citizen and not app.is_us_citizen:
        return CriteriaResult("citizenship", False, "US citizenship required for this program.", 5)
    return CriteriaResult("citizenship", True, "Citizenship check passed", 5)


def check_soft_costs(app, program) -> CriteriaResult:
    if not program.max_soft_cost_percent:
        return CriteriaResult("soft_costs", True, "No soft cost restriction", 3)
    if app.soft_cost_percent > program.max_soft_cost_percent:
        return CriteriaResult(
            "soft_costs", False,
            f"Soft costs {app.soft_cost_percent}% exceed {program.max_soft_cost_percent}% maximum.",
            3
        )
    return CriteriaResult("soft_costs", True, f"Soft costs {app.soft_cost_percent}% accepted", 3)


def evaluate_program(application, program) -> dict:
    """Evaluate an application against a program's criteria."""
    results = [
        check_fico(application, program),
        check_paynet(application, program),
        check_years_in_business(application, program),
        check_revenue(application, program),
        check_loan_amount(application, program),
        check_term(application, program),
        check_state(application, program),
        check_industry(application, program),
        check_equipment_type(application, program),
        check_equipment_age(application, program),
        check_bankruptcies(application, program),
        check_tax_liens(application, program),
        check_judgments(application, program),
        check_homeownership(application, program),
        check_citizenship(application, program),
        check_soft_costs(application, program),
    ]
    
    passed = [r for r in results if r.passed]
    failed = [r for r in results if not r.passed]
    
    total_weight = sum(r.weight for r in results)
    earned_weight = sum(r.weight for r in passed)
    fit_score = int((earned_weight / total_weight) * 100) if total_weight > 0 else 0
    
    return {
        "program_id": program.id,
        "program_name": program.name,
        "is_eligible": len(failed) == 0,
        "fit_score": fit_score,
        "criteria_results": {r.field: {"passed": r.passed, "reason": r.reason} for r in results},
        "rejection_reasons": [r.reason for r in failed]
    }


def match_application(application, programs: list) -> list:
    """Match application against all programs."""
    results = [evaluate_program(application, p) for p in programs if p.status == "active"]
    results.sort(key=lambda x: (x["is_eligible"], x["fit_score"]), reverse=True)
    return results
