"""Lógica de autenticación OAuth2 / OIDC (Google y Microsoft), simulador dev y JWT."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    DEFAULT_BOARD_STATUSES,
    Board,
    BoardAutomation,
    BoardStatusConfig,
    TaskGroup,
    User,
    Workspace,
)
from app.schemas import DevAccountInfo

SUPPORTED_PROVIDERS = ("google", "microsoft")

DEV_PRESET_ACCOUNTS: dict[str, dict[str, str]] = {
    "dev_google_ana": {
        "code": "dev_google_ana",
        "email": "ana@gestor.dev",
        "full_name": "Ana García",
        "role": "admin",
        "color": "#0073ea",
        "provider": "google",
    },
    "dev_google_lucia": {
        "code": "dev_google_lucia",
        "email": "lucia@gestor.dev",
        "full_name": "Lucía Méndez",
        "role": "member",
        "color": "#a25ddc",
        "provider": "google",
    },
    "dev_microsoft_carlos": {
        "code": "dev_microsoft_carlos",
        "email": "carlos@gestor.dev",
        "full_name": "Carlos Ruiz",
        "role": "admin",
        "color": "#00c875",
        "provider": "microsoft",
    },
    "dev_microsoft_martin": {
        "code": "dev_microsoft_martin",
        "email": "martin@gestor.dev",
        "full_name": "Martín López",
        "role": "member",
        "color": "#fdab3d",
        "provider": "microsoft",
    },
}

bearer_scheme = HTTPBearer(auto_error=False)


def validate_provider(provider: str) -> str:
    """Valida que el proveedor sea 'google' o 'microsoft'."""
    normalized = provider.strip().lower()
    if normalized not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proveedor OAuth no soportado: '{provider}'. Debe ser 'google' o 'microsoft'.",
        )
    return normalized


def has_real_oauth_credentials(provider: str) -> bool:
    """Indica si el proveedor tiene Client ID real configurado en el entorno."""
    if provider == "google":
        return bool(settings.GOOGLE_CLIENT_ID and str(settings.GOOGLE_CLIENT_ID).strip())
    if provider == "microsoft":
        return bool(settings.MICROSOFT_CLIENT_ID and str(settings.MICROSOFT_CLIENT_ID).strip())
    return False


def get_dev_accounts_for_provider(provider: str) -> list[DevAccountInfo]:
    """Devuelve las cuentas de desarrollo preconfiguradas para un proveedor."""
    if not settings.AUTH_DEV_MODE:
        return []
    return [
        DevAccountInfo(**info)
        for info in DEV_PRESET_ACCOUNTS.values()
        if info["provider"] == provider
    ]


def build_authorization_data(
    provider: str, redirect_uri: Optional[str] = None
) -> dict[str, str]:
    """Construye la URL de autorización OAuth2 oficial o del simulador de desarrollo."""
    provider = validate_provider(provider)
    effective_redirect = (
        redirect_uri.strip()
        if redirect_uri and redirect_uri.strip()
        else settings.FRONTEND_REDIRECT_URI
    )
    state = secrets.token_urlsafe(16)

    if has_real_oauth_credentials(provider):
        if provider == "google":
            params = {
                "client_id": str(settings.GOOGLE_CLIENT_ID).strip(),
                "redirect_uri": effective_redirect,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "online",
                "prompt": "select_account",
            }
            url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        else:
            tenant = str(settings.MICROSOFT_TENANT_ID or "common").strip() or "common"
            params = {
                "client_id": str(settings.MICROSOFT_CLIENT_ID).strip(),
                "redirect_uri": effective_redirect,
                "response_type": "code",
                "scope": "openid email profile User.Read",
                "state": state,
                "prompt": "select_account",
            }
            url = (
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
                f"?{urlencode(params)}"
            )
        return {
            "provider": provider,
            "mode": "oauth",
            "authorization_url": url,
            "state": state,
        }

    if settings.AUTH_DEV_MODE:
        params = {
            "provider": provider,
            "mode": "dev_simulator",
            "state": state,
        }
        sep = "&" if "?" in effective_redirect else "?"
        url = f"{effective_redirect}{sep}{urlencode(params)}"
        return {
            "provider": provider,
            "mode": "dev_simulator",
            "authorization_url": url,
            "state": state,
        }

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            f"Las credenciales OAuth2 para '{provider}' no están configuradas "
            "y AUTH_DEV_MODE está deshabilitado."
        ),
    )


def exchange_oauth_code_for_profile(
    provider: str, code: str, redirect_uri: str
) -> dict[str, Any]:
    """Intercambia el código de autorización con Google o Microsoft por el perfil del usuario."""
    provider = validate_provider(provider)

    if provider == "google":
        client_id = str(settings.GOOGLE_CLIENT_ID or "").strip()
        client_secret = str(settings.GOOGLE_CLIENT_SECRET or "").strip()
        if not client_id or not client_secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en la configuración.",
            )
        try:
            with httpx.Client(timeout=10.0) as client:
                token_res = client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                )
                if token_res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="No se pudo validar el código de autorización con Google.",
                    )
                token_data = token_res.json()
                access_token = token_data.get("access_token")
                if not access_token:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google no devolvió un access_token válido.",
                    )
                userinfo_res = client.get(
                    "https://openidconnect.googleapis.com/v1/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if userinfo_res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="No se pudo obtener el perfil del usuario desde Google.",
                    )
                profile = userinfo_res.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error de red al comunicarse con Google OAuth: {exc}",
            ) from exc

        email = profile.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El perfil de Google no contiene una dirección de email.",
            )
        return {
            "email": email.strip().lower(),
            "full_name": profile.get("name") or email.split("@")[0],
            "provider_subject_id": str(profile.get("sub") or f"google:{email}"),
            "avatar_url": profile.get("picture"),
        }

    # Microsoft / Entra ID
    client_id = str(settings.MICROSOFT_CLIENT_ID or "").strip()
    client_secret = str(settings.MICROSOFT_CLIENT_SECRET or "").strip()
    tenant = str(settings.MICROSOFT_TENANT_ID or "common").strip() or "common"
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Faltan MICROSOFT_CLIENT_ID o MICROSOFT_CLIENT_SECRET en la configuración.",
        )
    try:
        with httpx.Client(timeout=10.0) as client:
            token_res = client.post(
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                    "scope": "openid email profile User.Read",
                },
            )
            if token_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No se pudo validar el código de autorización con Microsoft.",
                )
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Microsoft no devolvió un access_token válido.",
                )
            userinfo_res = client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No se pudo obtener el perfil del usuario desde Microsoft Graph.",
                )
            profile = userinfo_res.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error de red al comunicarse con Microsoft OAuth: {exc}",
        ) from exc

    email = (
        profile.get("mail")
        or profile.get("userPrincipalName")
        or profile.get("email")
    )
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El perfil de Microsoft no contiene una dirección de email.",
        )
    return {
        "email": email.strip().lower(),
        "full_name": (
            profile.get("displayName")
            or profile.get("name")
            or email.split("@")[0]
        ),
        "provider_subject_id": str(
            profile.get("id") or profile.get("sub") or f"microsoft:{email}"
        ),
        "avatar_url": profile.get("picture"),
    }


def resolve_dev_profile(
    provider: str,
    code: str,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
) -> dict[str, Any]:
    """Resuelve los datos de usuario para un login simulado (code con prefijo 'dev_')."""
    if not settings.AUTH_DEV_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El simulador de autenticación de desarrollo está deshabilitado (AUTH_DEV_MODE=false).",
        )

    preset = DEV_PRESET_ACCOUNTS.get(code)
    if preset:
        resolved_email = (email or preset["email"]).strip().lower()
        resolved_name = (full_name or preset["full_name"]).strip()
        return {
            "email": resolved_email,
            "full_name": resolved_name,
            "provider_subject_id": f"{provider}:{resolved_email}",
            "color": preset["color"],
            "role": preset["role"],
            "avatar_url": None,
        }

    # Si no coincide exactamente con una clave pero envió email o sufijo en code:
    if email and email.strip():
        resolved_email = email.strip().lower()
        for acc in DEV_PRESET_ACCOUNTS.values():
            if acc["email"] == resolved_email:
                return {
                    "email": resolved_email,
                    "full_name": (full_name or acc["full_name"]).strip(),
                    "provider_subject_id": f"{provider}:{resolved_email}",
                    "color": acc["color"],
                    "role": acc["role"],
                    "avatar_url": None,
                }
    else:
        suffix = code[4:].strip("_ ").lower()
        for prefix in ("google_", "microsoft_"):
            if suffix.startswith(prefix):
                suffix = suffix[len(prefix) :]
        if not suffix:
            suffix = "devuser"
        for acc in DEV_PRESET_ACCOUNTS.values():
            if acc["email"].startswith(f"{suffix}@"):
                return {
                    "email": acc["email"],
                    "full_name": (full_name or acc["full_name"]).strip(),
                    "provider_subject_id": f"{provider}:{acc['email']}",
                    "color": acc["color"],
                    "role": acc["role"],
                    "avatar_url": None,
                }
        resolved_email = f"{suffix}@gestor.dev"

    resolved_name = (
        full_name.strip()
        if full_name and full_name.strip()
        else resolved_email.split("@")[0].replace(".", " ").replace("_", " ").title()
    )
    default_color = "#0073ea" if provider == "google" else "#00c875"
    return {
        "email": resolved_email,
        "full_name": resolved_name,
        "provider_subject_id": f"{provider}:{resolved_email}",
        "color": default_color,
        "role": "member",
        "avatar_url": None,
    }


def upsert_oauth_user(db: Session, provider: str, profile: dict[str, Any]) -> User:
    """Crea o actualiza el registro del usuario en la base de datos."""
    raw_email = profile.get("email")
    if not raw_email or not str(raw_email).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El perfil OAuth debe incluir un email válido.",
        )
    email = str(raw_email).strip().lower()
    full_name = str(
        profile.get("full_name")
        or profile.get("name")
        or email.split("@")[0]
    ).strip()
    provider_subject_id = str(
        profile.get("provider_subject_id")
        or profile.get("sub")
        or profile.get("id")
        or f"{provider}:{email}"
    )
    avatar_url = profile.get("avatar_url") or profile.get("picture")
    color = profile.get("color") or ("#0073ea" if provider == "google" else "#00c875")
    role = profile.get("role") or "member"

    user = db.query(User).filter(User.email == email).first()
    if user:
        user.auth_provider = provider
        user.provider_subject_id = provider_subject_id
        if full_name:
            user.full_name = full_name
        if avatar_url is not None:
            user.avatar_url = avatar_url
        user.is_active = True
    else:
        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            color=color,
            auth_provider=provider,
            provider_subject_id=provider_subject_id,
            role=role,
            is_active=True,
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    ensure_user_default_workspace(db, user)
    return user


def ensure_user_default_workspace(db: Session, user: User) -> None:
    """Asegura que un nuevo usuario posea al menos un Espacio de Trabajo limpio y un Tablero principal."""
    total_ws = db.query(Workspace).count()
    if total_ws == 0:
        ws = Workspace(
            name="Mi Espacio de Trabajo",
            description="Espacio principal de gestión",
            icon="Briefcase",
            color="#0073ea",
            owner_id=user.id,
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)

        board = Board(
            name="Tablero Principal",
            description="Gestioná tus tareas y proyectos visualmente",
            workspace_id=ws.id,
        )
        db.add(board)
        db.commit()
        db.refresh(board)

        for st in DEFAULT_BOARD_STATUSES:
            db.add(
                BoardStatusConfig(
                    board_id=board.id,
                    key=st["key"],
                    label=st["label"],
                    color=st["color"],
                    order_index=st["order_index"],
                    is_done=st["is_done"],
                )
            )

        grp1 = TaskGroup(board_id=board.id, title="Esta Semana", color="#579bfc", order_index=0)
        grp2 = TaskGroup(board_id=board.id, title="Próximas Tareas", color="#a25ddc", order_index=1)
        db.add_all([grp1, grp2])

        db.add_all([
            BoardAutomation(
                board_id=board.id,
                rule_type="when_checklist_complete_set_status",
                target_status_key="done",
                is_active=True,
            ),
            BoardAutomation(
                board_id=board.id,
                rule_type="when_status_done_complete_checklist",
                target_status_key="done",
                is_active=True,
            ),
            BoardAutomation(
                board_id=board.id,
                rule_type="when_status_blocked_log_alert",
                target_status_key="done",
                is_active=True,
            ),
        ])
        db.commit()


def create_access_token(user: User) -> str:
    """Genera un token JWT firmado con HS256 para la sesión del usuario."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=int(settings.JWT_EXPIRE_MINUTES))
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "provider": user.auth_provider,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependencia FastAPI que valida el Bearer JWT y retorna el usuario autenticado."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Se requiere token Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de sesión ha expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin identificador de usuario (sub).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(sub)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identificador de usuario inválido en el token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

