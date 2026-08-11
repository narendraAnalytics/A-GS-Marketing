from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.marketing import router as marketing_router

app = FastAPI(title="A&GS AI Marketing POC")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(marketing_router)
