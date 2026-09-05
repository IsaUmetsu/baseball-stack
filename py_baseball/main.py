
import asyncio
import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta

app = FastAPI()

BASE_DATA_PATH = os.environ.get("PY_BASEBALL_DATA_DIR", "/app")
SCRIPT_PATHS = {
    "scenes": os.path.join(os.path.dirname(__file__), "game_scenes.py"),
    "stats": os.path.join(os.path.dirname(__file__), "game_stats.py"),
    "starter": os.path.join(os.path.dirname(__file__), "game_announse_starter.py"),
}
OUTPUT_DIRS = {
    "scenes": os.path.join(BASE_DATA_PATH, "output"),
    "stats": os.path.join(BASE_DATA_PATH, "text"),
    "starter": os.path.join(BASE_DATA_PATH, "starter"),
}

# 1. Script Execution Endpoint (with SSE for live logs)
@app.get("/admin/run-script")
async def run_script(script_name: str, start_date: str, end_date: str):
    async def stream_logs():
        scripts_to_run = SCRIPT_PATHS.keys() if script_name == "all" else [script_name]
        for script in scripts_to_run:
            yield f"data: --- Running script: {script} ---\n\n"
            process = await asyncio.create_subprocess_exec(
                "python3", SCRIPT_PATHS[script], "-ss", start_date, "-se", end_date,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                yield f"data: {line.decode().strip()}\n\n"
            
            while True:
                line = await process.stderr.readline()
                if not line:
                    break
                yield f"data: [ERROR] {line.decode().strip()}\n\n"

            await process.wait()
            yield f"data: --- Script {script} finished with code {process.returncode} ---\n\n"
        yield f"data: [DONE]\n\n"

    return StreamingResponse(stream_logs(), media_type="text/event-stream")

# 2. Status Check Endpoint
@app.get("/admin/status")
async def get_status(start_date: str, end_date: str):
    results = []
    try:
        start_dt = datetime.strptime(start_date, "%Y%m%d")
        end_dt = datetime.strptime(end_date, "%Y%m%d")
    except ValueError:
        return {"error": "Invalid date format. Please use YYYYMMDD."}

    current_dt = start_dt
    while current_dt <= end_dt:
        date_str_api = current_dt.strftime("%Y%m%d")
        date_str_display = current_dt.strftime("%Y-%m-%d")
        day_status = {"date": date_str_display, "status": {}}
        
        for script_type in OUTPUT_DIRS:
            dir_path = os.path.join(OUTPUT_DIRS[script_type], date_str_api)
            file_count = 0
            if os.path.exists(dir_path) and os.path.isdir(dir_path):
                for root, _, files in os.walk(dir_path):
                    for name in files:
                        if name.endswith(".json"):
                            file_path = os.path.join(root, name)
                            if os.path.getsize(file_path) > 0:
                                file_count += 1
            
            day_status["status"][script_type] = {
                "exists": file_count > 0,
                "count": file_count
            }
        results.append(day_status)
        current_dt += timedelta(days=1)
        
    return results

# 3. File List Endpoint
@app.get("/admin/files")
async def list_files(script_type: str, date: str): # date should be YYYYMMDD
    if script_type not in OUTPUT_DIRS:
        return {"error": "Invalid script type"}
        
    base_dir = OUTPUT_DIRS[script_type]
    dir_path = os.path.join(base_dir, date)

    if not os.path.exists(dir_path) or not os.path.isdir(dir_path):
        return {"error": f"Directory not found for {script_type} on {date}", "files": []}
    
    file_list = []
    for root, _, files in os.walk(dir_path):
        for name in files:
            if name.endswith(".json"):
                full_path = os.path.join(root, name)
                # Return path relative to BASE_DATA_PATH for the file content API
                relative_path = os.path.relpath(full_path, BASE_DATA_PATH)
                file_list.append(relative_path)
    
    return {"files": sorted(file_list)}

# 4. File Content Endpoint
@app.get("/admin/file-content")
async def get_file_content(file_path: str):
    # Security: Ensure the path is within one of the allowed directories
    safe_base_dirs = list(OUTPUT_DIRS.values())
    full_path = os.path.abspath(os.path.join(BASE_DATA_PATH, file_path))
    
    if not any(full_path.startswith(os.path.abspath(safe_dir)) for safe_dir in safe_base_dirs):
        return {"error": "Access denied"}

    if not os.path.exists(full_path):
        return {"error": "File not found"}
        
    with open(full_path, 'r') as f:
        content = json.load(f)
        return content
