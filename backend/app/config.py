"""Configuración centralizada de la aplicación y variables de entorno."""

from __future__ import annotations

import os
from typing import Any
from dotenv import load_dotenv

load_dotenv()


def _parse_bool(value: Any, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    val_str = str(value).strip().lower()
    if val_str in ("1", "true", "yes", "on"):
        return True
    if val_str in ("0", "false", "no", "off"):
        return False
    return default


class Settings:
    """Configuración del backend con soporte para variables de entorno y monkeypatching."""

    _DEFAULTS: dict[str, Any] = {
        "APP_NAME": "Gestor de Proyectos API",
        "APP_VERSION": "0.1.0",
        "DATABASE_URL": "sqlite:///./gestor_proyectos.db",
        "JWT_SECRET_KEY": "dev-secret-key-change-in-production-gestor-proyectos-2026",
        "JWT_ALGORITHM": "HS256",
        "JWT_EXPIRE_MINUTES": 1440,
        "AUTH_DEV_MODE": True,
        "FRONTEND_REDIRECT_URI": "http://localhost:5173/auth/callback",
        "GOOGLE_CLIENT_ID": "",
        "GOOGLE_CLIENT_SECRET": "",
        "MICROSOFT_CLIENT_ID": "",
        "MICROSOFT_CLIENT_SECRET": "",
        "MICROSOFT_TENANT_ID": "common",
        "CORS_ORIGINS": "*",
        "SEED_DEMO_DATA": True,
        "STRIPE_SECRET_KEY": "",
        "STRIPE_WEBHOOK_SECRET": "",
        "BILLING_DEV_MODE": True,
    }

    def __init__(self) -> None:
        object.__setattr__(self, "_overrides", {})

    def _from_env(self, name: str) -> Any:
        default = self._DEFAULTS[name]
        raw = os.getenv(name)
        if raw is None:
            return default
        if isinstance(default, bool):
            return _parse_bool(raw, default=default)
        if isinstance(default, int):
            try:
                return int(raw)
            except ValueError:
                return default
        return raw

    def __getattr__(self, name: str) -> Any:
        overrides: dict[str, Any] = object.__getattribute__(self, "_overrides")
        if name in overrides:
            return overrides[name]
        if name in self._DEFAULTS:
            return self._from_env(name)
        raise AttributeError(f"'Settings' object has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        if name == "_overrides":
            object.__setattr__(self, name, value)
            return
        overrides: dict[str, Any] = object.__getattribute__(self, "_overrides")
        if name in self._DEFAULTS and value == self._from_env(name):
            overrides.pop(name, None)
        else:
            overrides[name] = value


settings = Settings()

