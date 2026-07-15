from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_BACKEND_DIR / ".env", extra="ignore")

    youtube_api_key: str = ""
    youtube_channel_id: str = ""

    soundcloud_client_id: str = ""
    soundcloud_username: str = ""

    refresh_interval_seconds: int = 3600
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def youtube_enabled(self) -> bool:
        return bool(self.youtube_api_key and self.youtube_channel_id)

    @property
    def soundcloud_enabled(self) -> bool:
        return bool(self.soundcloud_client_id and self.soundcloud_username)


settings = Settings()
