
import json
import sqlite3
import time
from http.server import BaseHTTPRequestHandler
from pathlib import Path


DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "public"
    / "data"
    / "netflix_insights.db"
)


def validate_sql(sql):
    sql = sql.strip().rstrip(";").strip()

    if not sql:
        raise ValueError("Query cannot be empty.")

    if ";" in sql:
        raise ValueError("Only one SQL statement is allowed.")

    # Remove SQL comments before checking the query.
    import re

    cleaned = re.sub(r"--[^\n]*", "", sql)
    cleaned = re.sub(r"/\*[\s\S]*?\*/", "", cleaned).strip()

    if not re.match(r"^(SELECT|WITH)\b", cleaned, re.IGNORECASE):
        raise ValueError("Only SELECT or WITH queries are allowed.")

    forbidden = re.compile(
        r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|"
        r"DETACH|REPLACE|VACUUM|REINDEX|PRAGMA)\b",
        re.IGNORECASE,
    )

    if forbidden.search(cleaned):
        raise ValueError("Write or schema-modifying queries are not allowed.")

    return sql


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))

            if content_length <= 0 or content_length > 65536:
                self.send_json(400, {"error": "Invalid request size."})
                return

            body = json.loads(self.rfile.read(content_length))
            raw_sql = body.get("sql", "")

            if not isinstance(raw_sql, str):
                self.send_json(400, {"error": "SQL must be a string."})
                return

            sql = validate_sql(raw_sql)

            if not DB_PATH.exists():
                self.send_json(
                    503,
                    {"error": "SQLite database is not available."},
                )
                return

            start = time.perf_counter()

            connection = sqlite3.connect(
                f"file:{DB_PATH.as_posix()}?mode=ro",
                uri=True,
                timeout=5,
            )

            try:
                cursor = connection.cursor()
                cursor.execute(sql)

                columns = [
                    description[0]
                    for description in (cursor.description or [])
                ]

                rows = cursor.fetchmany(500)

                result = {
                    "columns": columns,
                    "rows": rows,
                    "rowCount": len(rows),
                    "truncated": len(rows) == 500,
                    "executionMs": round(
                        (time.perf_counter() - start) * 1000, 2
                    ),
                }

            finally:
                connection.close()

            self.send_json(200, result)

        except ValueError as error:
            self.send_json(400, {"error": str(error)})

        except json.JSONDecodeError:
            self.send_json(400, {"error": "Invalid JSON request."})

        except sqlite3.Error as error:
            self.send_json(400, {"error": str(error)})

        except Exception:
            self.send_json(500, {"error": "SQL execution failed."})

    def do_GET(self):
        self.send_json(
            200,
            {"status": "ok", "message": "Netflix SQL API is running."},
        )

    def send_json(self, status, data):
        response = json.dumps(data).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)
