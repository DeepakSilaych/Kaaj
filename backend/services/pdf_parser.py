"""LLM-based PDF parsing service using Google Gemini SDK."""
import json
import os
import fitz
import google.generativeai as genai

EXTRACTION_PROMPT = """You are an expert at parsing lender program guidelines PDFs for equipment financing.

IMPORTANT: Extract ALL available information. Look carefully for:
- Credit scores (FICO, PayNet, Vantage, credit score requirements)
- Time in business requirements (years, months)
- Revenue requirements (annual, monthly)
- Loan amount ranges (min/max funding amounts)
- Term lengths (months)
- Bankruptcy/lien/judgment policies
- State restrictions
- Industry/equipment restrictions

Extract the following fields. Return ONLY valid JSON, no markdown.

{
    "name": "Lender/Program name from the document header or title",
    "description": "Brief 1-sentence description of what this program offers",
    
    "min_fico": integer - minimum FICO/credit score required (look for "FICO", "credit score", "personal score"),
    "max_fico": integer or null,
    "min_fico_no_paynet": integer or null - higher FICO if no business credit,
    "min_paynet": integer or null - minimum PayNet/business credit score,
    
    "min_years_in_business": float - minimum years/time in business (convert months to years, e.g. 6 months = 0.5),
    "min_years_no_paynet": float or null,
    "min_revenue": float or null - minimum annual revenue in dollars (convert monthly to annual),
    
    "min_loan_amount": float - minimum loan/funding amount,
    "max_loan_amount": float - maximum loan/funding amount,
    "max_term_months": integer - maximum term in months,
    
    "max_bankruptcies": integer - number of bankruptcies allowed (0 if "no bankruptcies"),
    "min_bankruptcy_years": integer or null - years since discharge required,
    "allow_tax_liens": boolean - false if tax liens disqualify,
    "allow_judgments": boolean - false if judgments disqualify,
    "allow_foreclosures": boolean - false if foreclosures disqualify,
    
    "require_homeownership": boolean - true if homeownership required,
    "require_us_citizen": boolean - true if US citizen/resident required,
    
    "max_equipment_age_years": integer or null - max age of equipment,
    "max_soft_cost_percent": integer or null - max soft costs percentage,
    
    "restricted_states": ["XX", "YY"] - 2-letter codes of states NOT allowed,
    "restricted_industries": ["Industry1", "Industry2"] - industries NOT allowed,
    "allowed_equipment_types": [] - equipment types explicitly allowed (empty if not specified),
    "excluded_equipment_types": ["Type1"] - equipment types NOT allowed,
    
    "industry_loan_limits": {} - special limits by industry,
    
    "priority": 1-3 (3=top tier/best rates, 2=mid, 1=standard/subprime)
}

Use null for fields that are truly not mentioned. DO NOT leave fields as null if the information exists anywhere in the document.

Return ONLY the JSON object.

PDF TEXT:
"""


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text content from PDF file."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def parse_pdf_with_llm(pdf_text: str) -> dict:
    """Use Gemini SDK to extract structured program data from PDF text."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY not set"}
    
    # Configure SDK
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    prompt = EXTRACTION_PROMPT + pdf_text[:30000]
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=4000,
            )
        )
    except Exception as e:
        return {"error": f"Gemini API error: {e}"}
    
    response_text = response.text
    
    # Clean up response - remove markdown code blocks if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    response_text = response_text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    
    try:
        extracted = json.loads(response_text)
    except json.JSONDecodeError as e:
        return {
            "error": f"Failed to parse LLM response: {e}",
            "raw_response": response_text[:1000]
        }
    
    return extracted


def parse_pdf_file(pdf_path: str) -> dict:
    """Full pipeline: extract text and parse with LLM."""
    text = extract_text_from_pdf(pdf_path)
    result = parse_pdf_with_llm(text)
    result["source_pdf"] = pdf_path
    result["text_preview"] = text[:2000]
    return result


def parse_pdf_bytes(pdf_bytes: bytes, filename: str) -> dict:
    """Parse PDF from bytes."""
    text = extract_text_from_bytes(pdf_bytes)
    result = parse_pdf_with_llm(text)
    result["filename"] = filename
    result["text_preview"] = text[:2000]
    return result
