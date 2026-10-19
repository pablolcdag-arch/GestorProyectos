"""Endpoints de autenticación OAuth2 / OIDC (Google y Microsoft) y directorio de usuarios."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import app.auth as auth_service
from app.auth import (
    SUPPORTED_PROVIDERS,
    build_authorization_data,
    create_access_token,
    exchange_oauth_code_for_profile as _default_exchange_oauth_code_for_profile,
    get_current_user,
    get_dev_accounts_for_provider,
    has_real_oauth_credentials,
    resolve_dev_profile,
    upsert_oauth_user,
    validate_provider,
)
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import (
    OAuthAuthorizeResponse,
    OAuthCallbackRequest,
    OAuthProviderConfig,
    TokenResponse,
    UserRead,
)

router = APIRouter(prefix="/api", tags=["Autenticación y Usuarios"])

# Referencia exportada para facilitar monkeypatching tanto en app.auth como en auth_router
exchange_oauth_code_for_profile = _default_exchange_oauth_code_for_profile


@router.get("/auth/providers", response_model=list[OAuthProviderConfig])
def list_auth_providers() -> list[OAuthProviderConfig]:
    """Devuelve la configuración activa de los proveedores OAuth2 (Google y Microsoft)."""
    providers: list[OAuthProviderConfig] = []
    for provider in SUPPORTED_PROVIDERS:
        real_oauth = has_real_oauth_credentials(provider)
        if real_oauth:
            mode = "oauth"
            enabled = True
        elif settings.AUTH_DEV_MODE:
            mode = "dev_simulator"
            enabled = True
        else:
            mode = "disabled"
            enabled = False

        providers.append(
            OAuthProviderConfig(
                provider=provider,
                enabled=enabled,
                mode=mode,
                dev_accounts=get_dev_accounts_for_provider(provider),
            )
        )
    return providers


@router.get(
    "/auth/oauth/{provider}/authorize",
    response_model=OAuthAuthorizeResponse,
)
def oauth_authorize(
    provider: str,
    redirect_uri: Optional[str] = Query(default=None),
) -> OAuthAuthorizeResponse:
    """Genera la URL de autorización para Google o Microsoft (modo OAuth real o dev_simulator)."""
    data = build_authorization_data(provider=provider, redirect_uri=redirect_uri)
    return OAuthAuthorizeResponse(**data)


@router.post(
    "/auth/oauth/{provider}/callback",
    response_model=TokenResponse,
)
def oauth_callback(
    provider: str,
    payload: OAuthCallbackRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Intercambia el código OAuth2 (o código dev_) y emite un token JWT firmado."""
    normalized_provider = validate_provider(provider)
    code = payload.code.strip()
    effective_redirect = (
        payload.redirect_uri.strip()
        if payload.redirect_uri and payload.redirect_uri.strip()
        else settings.FRONTEND_REDIRECT_URI
    )

    if code.startswith("dev_"):
        profile = resolve_dev_profile(
            provider=normalized_provider,
            code=code,
            email=payload.email,
            full_name=payload.full_name,
        )
    else:
        # Soporta monkeypatching tanto en auth_router como en app.auth
        exchange_fn = (
            exchange_oauth_code_for_profile
            if exchange_oauth_code_for_profile is not _default_exchange_oauth_code_for_profile
            else auth_service.exchange_oauth_code_for_profile
        )
        profile = exchange_fn(
            normalized_provider,
            code,
            effective_redirect,
        )

    user = upsert_oauth_user(db=db, provider=normalized_provider, profile=profile)
    token = create_access_token(user)
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.get("/auth/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Devuelve el perfil del usuario actualmente autenticado."""
    return current_user


@router.get("/users", response_model=list[UserRead])
def list_active_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[User]:
    """Lista todos los usuarios activos del equipo para asignación de tareas."""
    return (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )

