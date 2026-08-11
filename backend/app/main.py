from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.linkedin import router as linkedin_router
from app.routers.marketing import router as marketing_router

app = FastAPI(title="A&GS AI Marketing POC")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_allowed_origins_list,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(marketing_router)
app.include_router(linkedin_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
