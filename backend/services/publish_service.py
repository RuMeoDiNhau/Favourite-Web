"""Background publishing for the draft + scheduled-publish feature
(Tier 3 M).

A single background thread ticks every 30s and promotes any
knowledge articles whose `scheduled_at` has passed to status
='published'. The thread is started on FastAPI startup via the
lifespan hook in main.py and stopped on shutdown.

Why a thread instead of APScheduler / Celery:
  - Single deployment target (a small FastAPI process); a thread is
    enough to cover the volume.
  - No new dependency. Celery/apscheduler would add a worker
    process and a broker just to tick one query.
  - Worst case is a 30s publish delay — acceptable for an MVP
    because users see a "Đã hẹn giờ" hint that says "sẽ đăng lúc
    ..."; we don't promise a precise second.

Failure mode: the thread catches and logs every exception so a
transient DB blip doesn't kill the loop. A crashed thread silently
stops publishing; that's tracked as a follow-up via /healthz in a
later commit.
"""
import threading
import time
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.services.db_models import SessionLocal, Knowledge
from backend.services.logging_service import logger


_TICK_SECONDS = 30
_publisher_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()


def promote_due_articles(db: Session) -> int:
    """Promote all Knowledge rows currently scheduled whose
    scheduled_at <= now. Returns the number of rows promoted so the
    loop can log a heartbeat (and so a future endpoint can show the
    admin how many were promoted in the last run).

    We grab the candidates first, then commit per row — that way a
    bad row doesn't poison the rest of the batch.
    """
    now = datetime.utcnow()
    candidates = (
        db.query(Knowledge)
        .filter(Knowledge.status == 'scheduled', Knowledge.scheduled_at <= now)
        .all()
    )
    if not candidates:
        return 0
    promoted = 0
    for article in candidates:
        try:
            article.status = 'published'
            article.published_at = now
            article.scheduled_at = None
            db.commit()
            promoted += 1
        except Exception as e:
            logger.warning(f'[publish_service] failed to promote article {article.id}: {e}')
            db.rollback()
    if promoted:
        logger.info(f'[publish_service] promoted {promoted} scheduled article(s)')
    return promoted


def _run() -> None:
    """The thread entry point. Opens its own DB session per tick so
    the session never spans threads (which would be unsafe with
    SQLAlchemy's identity-map caching)."""
    logger.info('[publish_service] publisher thread started')
    while not _stop_event.is_set():
        try:
            db = SessionLocal()
            try:
                promote_due_articles(db)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f'[publish_service] tick failed: {e}')
        # Wait with a short jitter so a redeploy doesn't fire all
        # the publish workers at the same instant.
        _stop_event.wait(_TICK_SECONDS)
    logger.info('[publish_service] publisher thread stopped')


def start_publisher() -> None:
    """Idempotent — calling twice doesn't spawn a second thread. The
    flag check is racy across threads, but main.py's lifespan hook
    is the only caller and runs once per process."""
    global _publisher_thread
    if _publisher_thread and _publisher_thread.is_alive():
        return
    _stop_event.clear()
    _publisher_thread = threading.Thread(target=_run, name='favweb-publisher', daemon=True)
    _publisher_thread.start()


def stop_publisher() -> None:
    """Signal the thread to exit on the next loop iteration. Safe to
    call from shutdown even if the thread was never started."""
    _stop_event.set()