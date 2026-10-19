"""Pruebas automatizadas del flujo OAuth2 / OIDC (Google y Microsoft), simulador dev y JWT."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.auth as auth_module
import app.routers.auth_router as auth_router_module
from app.config import settings
from app.models import User


def test_list_auth_providers_dev_mode(client: TestClient) -> None:
    """Verifica que /api/auth/providers devuelva Google y Microsoft con sus cuentas dev."""
    res = client.get("/api/auth/providers")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 2

    by_provider = {item["provider"]: item for item in data}
    assert "google" in by_provider
    assert "microsoft" in by_provider

    google_cfg = by_provider["google"]
    assert google_cfg["enabled"] is True
    assert google_cfg["mode"] == "dev_simulator"
    assert len(google_cfg["dev_accounts"]) >= 2
    assert any(acc["email"] == "ana@gestor.dev" for acc in google_cfg["dev_accounts"])

    ms_cfg = by_provider["microsoft"]
    assert ms_cfg["enabled"] is True
    assert ms_cfg["mode"] == "dev_simulator"
    assert len(ms_cfg["dev_accounts"]) >= 2
    assert any(acc["email"] == "carlos@gestor.dev" for acc in ms_cfg["dev_accounts"])


def test_authorize_url_dev_and_real_oauth_modes(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verifica la generación de URLs de autorización en modo dev y en modo OAuth real."""
    # 1. Modo dev_simulator por defecto
    res_google_dev = client.get(
        "/api/auth/oauth/google/authorize",
        params={"redirect_uri": "http://localhost:5173/auth/callback"},
    )
    assert res_google_dev.status_code == 200
    body_g_dev = res_google_dev.json()
    assert body_g_dev["provider"] == "google"
    assert body_g_dev["mode"] == "dev_simulator"
    assert "provider=google" in body_g_dev["authorization_url"]
    assert "mode=dev_simulator" in body_g_dev["authorization_url"]
    assert body_g_dev["state"]

    res_ms_dev = client.get("/api/auth/oauth/microsoft/authorize")
    assert res_ms_dev.status_code == 200
    body_ms_dev = res_ms_dev.json()
    assert body_ms_dev["provider"] == "microsoft"
    assert body_ms_dev["mode"] == "dev_simulator"
    assert "provider=microsoft" in body_ms_dev["authorization_url"]

    # 2. Modo OAuth Real configurando Client IDs mediante monkeypatch
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "google-real-client-id-123.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "MICROSOFT_CLIENT_ID", "ms-real-client-id-456")
    monkeypatch.setattr(settings, "MICROSOFT_TENANT_ID", "organizations")

    res_google_real = client.get(
        "/api/auth/oauth/google/authorize",
        params={"redirect_uri": "http://localhost:5173/auth/callback"},
    )
    assert res_google_real.status_code == 200
    body_g_real = res_google_real.json()
    assert body_g_real["provider"] == "google"
    assert body_g_real["mode"] == "oauth"
    assert body_g_real["authorization_url"].startswith(
        "https://accounts.google.com/o/oauth2/v2/auth?"
    )
    assert "google-real-client-id-123" in body_g_real["authorization_url"]

    res_ms_real = client.get(
        "/api/auth/oauth/microsoft/authorize",
        params={"redirect_uri": "http://localhost:5173/auth/callback"},
    )
    assert res_ms_real.status_code == 200
    body_ms_real = res_ms_real.json()
    assert body_ms_real["provider"] == "microsoft"
    assert body_ms_real["mode"] == "oauth"
    assert body_ms_real["authorization_url"].startswith(
        "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?"
    )
    assert "ms-real-client-id-456" in body_ms_real["authorization_url"]


def test_authorize_unsupported_provider_and_disabled_dev_mode(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verifica 400 ante proveedor inválido y 503 cuando no hay credenciales ni AUTH_DEV_MODE."""
    res_invalid = client.get("/api/auth/oauth/github/authorize")
    assert res_invalid.status_code == 400

    monkeypatch.setattr(settings, "AUTH_DEV_MODE", False)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    res_unavailable = client.get("/api/auth/oauth/google/authorize")
    assert res_unavailable.status_code == 503


def test_oauth_callback_dev_mode_google_and_microsoft(
    client: TestClient, db_session: Session
) -> None:
    """Verifica el login con códigos dev_ en Google y Microsoft y la emisión de JWT válido."""
    # Login Google con cuenta existente (Ana)
    res_google = client.post(
        "/api/auth/oauth/google/callback",
        json={"code": "dev_google_ana"},
    )
    assert res_google.status_code == 200
    data_g = res_google.json()
    assert data_g["token_type"] == "bearer"
    assert data_g["user"]["email"] == "ana@gestor.dev"
    assert data_g["user"]["auth_provider"] == "google"

    decoded = jwt.decode(
        data_g["access_token"],
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    assert decoded["email"] == "ana@gestor.dev"
    assert decoded["provider"] == "google"

    # Login Microsoft con usuario nuevo en modo dev
    res_ms = client.post(
        "/api/auth/oauth/microsoft/callback",
        json={
            "code": "dev_microsoft_custom",
            "email": "sofia@empresa.com",
            "full_name": "Sofía Peralta",
        },
    )
    assert res_ms.status_code == 200
    data_ms = res_ms.json()
    assert data_ms["user"]["email"] == "sofia@empresa.com"
    assert data_ms["user"]["full_name"] == "Sofía Peralta"
    assert data_ms["user"]["auth_provider"] == "microsoft"

    db_user = db_session.query(User).filter(User.email == "sofia@empresa.com").first()
    assert db_user is not None
    assert db_user.auth_provider == "microsoft"


def test_oauth_callback_rejects_dev_code_when_dev_mode_false(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verifica que si AUTH_DEV_MODE=False se rechacen códigos dev_ con 403 Forbidden."""
    monkeypatch.setattr(settings, "AUTH_DEV_MODE", False)
    res = client.post(
        "/api/auth/oauth/google/callback",
        json={"code": "dev_google_ana"},
    )
    assert res.status_code == 403


def test_oauth_callback_real_mode_mocked_google_and_microsoft(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, db_session: Session
) -> None:
    """Verifica el callback en modo OAuth real mockeando exchange_oauth_code_for_profile."""

    def fake_exchange(provider: str, code: str, redirect_uri: str) -> dict[str, str]:
        if provider == "google":
            assert code == "real_google_auth_code_abc"
            return {
                "email": "pablo.google@empresa.com",
                "full_name": "Pablo Google",
                "provider_subject_id": "google-sub-999",
                "avatar_url": "https://lh3.googleusercontent.com/a/avatar",
            }
        assert provider == "microsoft"
        assert code == "real_ms_auth_code_xyz"
        return {
            "email": "pablo.ms@empresa.com",
            "full_name": "Pablo Microsoft",
            "provider_subject_id": "ms-oid-888",
            "avatar_url": None,
        }

    monkeypatch.setattr(auth_module, "exchange_oauth_code_for_profile", fake_exchange)
    monkeypatch.setattr(
        auth_router_module, "exchange_oauth_code_for_profile", fake_exchange
    )

    # Google OAuth real
    res_g = client.post(
        "/api/auth/oauth/google/callback",
        json={
            "code": "real_google_auth_code_abc",
            "redirect_uri": "http://localhost:5173/auth/callback",
        },
    )
    assert res_g.status_code == 200
    body_g = res_g.json()
    assert body_g["user"]["email"] == "pablo.google@empresa.com"
    assert body_g["user"]["auth_provider"] == "google"
    assert body_g["user"]["provider_subject_id"] == "google-sub-999"

    # Microsoft OAuth real
    res_ms = client.post(
        "/api/auth/oauth/microsoft/callback",
        json={
            "code": "real_ms_auth_code_xyz",
            "redirect_uri": "http://localhost:5173/auth/callback",
        },
    )
    assert res_ms.status_code == 200
    body_ms = res_ms.json()
    assert body_ms["user"]["email"] == "pablo.ms@empresa.com"
    assert body_ms["user"]["auth_provider"] == "microsoft"
    assert body_ms["user"]["provider_subject_id"] == "ms-oid-888"

    assert (
        db_session.query(User)
        .filter(User.email == "pablo.google@empresa.com")
        .count()
        == 1
    )
    assert (
        db_session.query(User)
        .filter(User.email == "pablo.ms@empresa.com")
        .count()
        == 1
    )


def test_auth_me_and_users_endpoints_security(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica acceso a /api/auth/me y /api/users con JWT válido y rechazo 401 sin/mal token."""
    # Acceso válido a /api/auth/me
    res_me = client.get("/api/auth/me", headers=auth_headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "ana@gestor.dev"

    # Acceso válido a /api/users
    res_users = client.get("/api/users", headers=auth_headers)
    assert res_users.status_code == 200
    users = res_users.json()
    assert len(users) == 4
    emails = {u["email"] for u in users}
    assert {
        "ana@gestor.dev",
        "carlos@gestor.dev",
        "lucia@gestor.dev",
        "martin@gestor.dev",
    }.issubset(emails)

    # Sin token -> 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/users").status_code == 401

    # Con token inválido -> 401
    bad_headers = {"Authorization": "Bearer token.invalido.manipulado"}
    assert client.get("/api/auth/me", headers=bad_headers).status_code == 401

    # Con token expirado -> 401
    expired_payload = {
        "sub": "1",
        "email": "ana@gestor.dev",
        "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()),
    }
    expired_token = jwt.encode(
        expired_payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    expired_headers = {"Authorization": f"Bearer {expired_token}"}
    assert client.get("/api/auth/me", headers=expired_headers).status_code == 401

