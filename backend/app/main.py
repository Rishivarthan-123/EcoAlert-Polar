import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.prediction_routes import (
    router as prediction_router,
)
from app.routes.risk_routes import (
    router as risk_router,
)
from app.routes.load_routes import (
    router as load_router,
)
from app.routes.digital_twin_routes import (
    router as digital_twin_router,
)
from app.routes.safety_routes import (
    router as safety_router,
)
from app.routes.history_routes import (
    router as history_router,
)
from app.routes.station_routes import (
    router as station_router,
)


app = FastAPI(
    title="EcoAlert Polar API",
    description=(
        "AI-Driven Smart Energy Management System "
        "for Polar Research Stations"
    ),
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(station_router)
app.include_router(prediction_router)
app.include_router(risk_router)
app.include_router(load_router)
app.include_router(digital_twin_router)
app.include_router(safety_router)
app.include_router(history_router)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ecoalert-polar-backend",
    }


# Mount static files for the frontend so visiting http://localhost:8000/ serves index.html directly
frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")