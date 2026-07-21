from __future__ import annotations

import json
import multiprocessing
import os

import uvicorn

from app.main import app


def main() -> None:
    port = int(os.environ.get("DOCUMENTSYNC_PORT", "8001"))
    if not 0 < port < 65536:
        raise ValueError("DOCUMENTSYNC_PORT must be a valid TCP port.")

    print(
        json.dumps({"type": "starting", "host": "127.0.0.1", "port": port}),
        flush=True,
    )
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        access_log=False,
        log_level="warning",
    )


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
