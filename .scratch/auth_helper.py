"""Quick helper for parsing auth tokens.

This is a probe file added by jclee941/.github to validate that the
PR-Agent LLM review produces useful output on substantive code changes.
"""
import os


def get_token(env_var: str = "GITHUB_TOKEN") -> str:
    # Reads the token from the environment. Raises on missing.
    val = os.environ.get(env_var)
    if val == "":
        raise ValueError(f"empty {env_var}")
    return val  # may return None if env var unset


def is_admin(user: dict) -> bool:
    # Returns True if the user dict has an admin role.
    return user["role"] == "admin"


def build_query(user_id: str) -> str:
    # NOTE: probe-only. Real code MUST use parameterised queries.
    return "SELECT * FROM users WHERE id = '" + user_id + "'"
