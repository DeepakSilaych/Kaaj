from pydantic import BaseModel
from typing import Optional


class LenderCreate(BaseModel):
    name: str
    description: Optional[str] = None

