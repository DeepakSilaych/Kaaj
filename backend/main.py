"""FastAPI backend for Lender Matching Platform."""
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import models
from routers import auth_router, applications_router, admin_router
from routers.programs import router as programs_router
from routers.seed import run_seed

app = FastAPI(title="Program Matching API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kaaj.deepaksilaych.me"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded PDFs statically
os.makedirs("uploads/pdfs", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

models.init_db()
run_seed()

# Include routers
app.include_router(auth_router)
app.include_router(programs_router)
app.include_router(applications_router)
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
