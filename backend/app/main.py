"""FastAPI entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import agents, auth, compliance, company, health, query, regulations, logs, departments
from app.services.scheduler import start_scheduler, stop_scheduler
from app.utils.logger import get_logger

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.SCHEDULER_ENABLED:
        try:
            start_scheduler()
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to start scheduler: %s", exc)
    yield
    # Shutdown
    if settings.SCHEDULER_ENABLED:
        try:
            stop_scheduler()
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to stop scheduler: %s", exc)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = settings.API_V1_PREFIX
    app.include_router(health.router, prefix=prefix, tags=["health"])
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(agents.router, prefix=f"{prefix}/agents", tags=["agents"])
    app.include_router(compliance.router, prefix=f"{prefix}/compliance", tags=["compliance"])
    app.include_router(company.router, prefix=f"{prefix}/company", tags=["company"])
    app.include_router(query.router, prefix=f"{prefix}/query", tags=["query"])
    app.include_router(regulations.router, prefix=f"{prefix}/regulations", tags=["regulations"])
    app.include_router(logs.router, prefix=f"{prefix}/logs", tags=["logs"])
    app.include_router(departments.router, prefix=f"{prefix}/departments", tags=["departments"])

    return app


app = create_app()

