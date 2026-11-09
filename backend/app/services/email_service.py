"""
Transactional Email Service for Patent Prior-Art Search Engine.
Supports pluggable backends:
- SMTPEmailBackend (Production via SMTP / AWS SES / SendGrid / Postmark)
- FileSpoolEmailBackend (Development & Test spool with audit verification)
- ConsoleEmailBackend (Stdout logging)
"""

import json
import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from backend.app.config import settings

logger = logging.getLogger("patent_email_service")


class EmailMessage:
    def __init__(
        self,
        to_email: str,
        subject: str,
        text_content: str,
        html_content: str | None = None,
        from_email: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        self.to_email = to_email.strip().lower()
        self.subject = subject
        self.text_content = text_content
        self.html_content = html_content or text_content
        self.from_email = from_email or getattr(settings, "SMTP_FROM", "noreply@patentsearchengine.com")
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow()

    def to_dict(self) -> dict[str, Any]:
        return {
            "to_email": self.to_email,
            "from_email": self.from_email,
            "subject": self.subject,
            "text_content": self.text_content,
            "html_content": self.html_content,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() + "Z",
        }


class SMTPEmailBackend:
    """Connects to real SMTP server (AWS SES, SendGrid, etc.) with TLS."""

    def __init__(
        self,
        host: str,
        port: int = 587,
        user: str | None = None,
        password: str | None = None,
        use_tls: bool = True,
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.use_tls = use_tls

    def send(self, msg: EmailMessage) -> bool:
        try:
            mime_msg = MIMEMultipart("alternative")
            mime_msg["Subject"] = msg.subject
            mime_msg["From"] = msg.from_email
            mime_msg["To"] = msg.to_email

            mime_msg.attach(MIMEText(msg.text_content, "plain"))
            if msg.html_content:
                mime_msg.attach(MIMEText(msg.html_content, "html"))

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(msg.from_email, [msg.to_email], mime_msg.as_string())

            logger.info(f"Dispatched transactional email to {msg.to_email} via SMTP ({self.host})")
            return True
        except Exception as e:
            logger.error(f"Failed to deliver email to {msg.to_email} via SMTP: {e}")
            return False


class FileSpoolEmailBackend:
    """Spools transactional emails as JSON files in data/email_spool for test verification."""

    def __init__(self, spool_dir: str = "data/email_spool"):
        self.spool_dir = spool_dir
        os.makedirs(self.spool_dir, exist_ok=True)

    def send(self, msg: EmailMessage) -> bool:
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"email_{timestamp}_{msg.to_email.replace('@', '_at_')}.json"
            filepath = os.path.join(self.spool_dir, filename)

            with open(filepath, "w") as f:
                json.dump(msg.to_dict(), f, indent=2)

            logger.info(f"Spooled transactional email to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to spool email: {e}")
            return False

    def get_latest_email(self, to_email: str | None = None) -> dict[str, Any] | None:
        """Helper for test suites to inspect outbound emails."""
        if not os.path.exists(self.spool_dir):
            return None
        files = sorted(os.listdir(self.spool_dir), reverse=True)
        for fname in files:
            if not fname.endswith(".json"):
                continue
            with open(os.path.join(self.spool_dir, fname), "r") as f:
                data = json.load(f)
                if not to_email or data.get("to_email") == to_email.lower().strip():
                    return data
        return None


class EmailService:
    def __init__(self):
        backend_type = getattr(settings, "EMAIL_BACKEND", "spool").lower()
        smtp_host = getattr(settings, "SMTP_HOST", None)

        if backend_type == "smtp" and smtp_host:
            self.backend = SMTPEmailBackend(
                host=smtp_host,
                port=getattr(settings, "SMTP_PORT", 587),
                user=getattr(settings, "SMTP_USER", None),
                password=getattr(settings, "SMTP_PASSWORD", None),
                use_tls=getattr(settings, "SMTP_TLS", True),
            )
        else:
            self.backend = FileSpoolEmailBackend()

    def send_password_reset_email(self, to_email: str, user_name: str, reset_token: str) -> bool:
        """Sends a secure, time-limited password recovery email."""
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3001")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        subject = "Patent Prior-Art Search Engine — Password Reset Request"
        text = (
            f"Hello {user_name},\n\n"
            f"A password reset request was submitted for your Patent Prior-Art Search Engine account.\n\n"
            f"Click the link below to set a new password (valid for 1 hour):\n"
            f"{reset_link}\n\n"
            f"If you did not make this request, you can safely disregard this email. Your account remains secure.\n\n"
            f"— Patent Prior-Art Search Engine Security Team"
        )
        html = (
            f"<div style='font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;'>"
            f"<h2 style='color: #0F172A; font-size: 18px; margin-bottom: 16px;'>Password Recovery Instructions</h2>"
            f"<p style='color: #475569; font-size: 14px; line-height: 1.5;'>Hello {user_name},</p>"
            f"<p style='color: #475569; font-size: 14px; line-height: 1.5;'>A password reset request was submitted for your account. Click the button below to configure a new password. This token expires in 1 hour.</p>"
            f"<div style='margin: 24px 0;'><a href='{reset_link}' style='background: #0F172A; color: #FFFFFF; padding: 10px 20px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 5px; display: inline-block;'>Reset Password &rarr;</a></div>"
            f"<p style='color: #94A3B8; font-size: 12px; margin-top: 24px;'>Or paste this URL into your browser: <br/><a href='{reset_link}' style='color: #1E40AF;'>{reset_link}</a></p>"
            f"<hr style='border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;' />"
            f"<p style='color: #94A3B8; font-size: 11px;'>Patent Prior-Art Search Engine &bull; Zero-Retention Enterprise Security</p>"
            f"</div>"
        )

        msg = EmailMessage(
            to_email=to_email,
            subject=subject,
            text_content=text,
            html_content=html,
            metadata={"type": "password_reset", "reset_token": reset_token},
        )
        return self.backend.send(msg)

    def send_workspace_invitation_email(
        self, to_email: str, inviter_name: str, workspace_name: str, role: str
    ) -> bool:
        """Sends an invitation to join an organization research workspace."""
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3001")
        join_link = f"{frontend_url}/login"

        subject = f"Invitation to join '{workspace_name}' on Patent Prior-Art Search Engine"
        text = (
            f"Hello,\n\n"
            f"{inviter_name} has invited you to join the research workspace '{workspace_name}' as a {role}.\n\n"
            f"Sign in to access shared matters, claim charts, and evidence ledgers:\n"
            f"{join_link}\n\n"
            f"— Patent Prior-Art Search Engine Team"
        )
        msg = EmailMessage(
            to_email=to_email,
            subject=subject,
            text_content=text,
            metadata={"type": "workspace_invite", "workspace": workspace_name, "role": role},
        )
        return self.backend.send(msg)


email_service = EmailService()

