"""LLM-based PDF parsing service using Google Gemini SDK."""
import json
import os
import fitz
import google.generativeai as genai

EXTRACTION_PROMPT = """You are an expert at parsing lender program guidelines PDFs for equipment financing.

Extract the following fields from this PDF text. Return ONLY valid JSON, no markdown.

Required fields (use null if not found):
{
    "name": "Program name (e.g., 'Stearns Bank - Tier A')",
    "description": "Brief description of the program",
    
    "min_fico": integer or null,
    "max_fico": integer or null,
    "min_fico_no_paynet": integer or null (higher FICO required if no PayNet score),
    "min_paynet": integer or null,
    
    "min_years_in_business": float or null,
    "min_years_no_paynet": float or null (higher TIB required if no PayNet),
    "min_revenue": float or null (annual revenue in dollars),
    
    "min_loan_amount": float or null,
    "max_loan_amount": float or null,
    "max_term_months": integer or null,
    
    "max_bankruptcies": integer (default 0),
    "min_bankruptcy_years": integer or null (years since discharge required),
    "allow_tax_liens": boolean (default true),
    "allow_judgments": boolean (default true),
    "allow_foreclosures": boolean (default true),
    
    "require_homeownership": boolean (default false),
    "require_us_citizen": boolean (default false),
    
    "max_equipment_age_years": integer or null,
    "max_soft_cost_percent": integer or null,
    
    "restricted_states": list of 2-letter state codes that are NOT allowed,
    "restricted_industries": list of industry names that are NOT allowed,
    "allowed_equipment_types": list of equipment types that ARE allowed (empty = all allowed),
    "excluded_equipment_types": list of equipment types NOT allowed,
    
    "industry_loan_limits": object mapping industry names to max loan amounts (e.g., {"Trucking": 150000}),
    
    "priority": integer 1-3 (3=best tier, 1=standard)
}

Return ONLY the JSON object, no explanations.

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
