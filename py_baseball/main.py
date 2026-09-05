
import asyncio
import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from datetime import datetime, timedelta
import signal

app = FastAPI()

# --- Globals ---
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

# Dictionary to keep track of running processes
# { "script_name": { "process": <Process object>, "start_date": "...", "end_date": "..." } }
RUNNING_PROCESSES = {}

# --- API Endpoints ---

@app.get("/admin/run-script")
async def run_script(script_name: str, start_date: str, end_date: str):
    if script_name in RUNNING_PROCESSES or "all" in RUNNING_PROCESSES:
        return JSONResponse(status_code=409, content={"error": f"A script ('{next(iter(RUNNING_PROCESSES.keys()))}') is already running."})

    scripts_to_run = SCRIPT_PATHS.keys() if script_name == "all" else [script_name]
    
    # Store process info
    # For "all", we just use "all" as the key. A bit simplistic but works for now.
    proc_key = "all" if script_name == "all" else script_name

    async def stream_logs():
        try:
            yield f"data: Process key '{proc_key}' registered.\n\n"
            
            start_dt = datetime.strptime(start_date, "%Y%m%d")
            end_dt = datetime.strptime(end_date, "%Y%m%d")
            current_dt = start_dt

            while current_dt <= end_dt:
                date_str = current_dt.strftime("%Y%m%d")
                
                for script in scripts_to_run:
                    if proc_key not in RUNNING_PROCESSES: # Check if cancelled
                        yield f"data: Execution was cancelled. Stopping...\n\n"
                        break
                        
                    yield f"data: Starting {script} for {date_str}\n\n"
                    process = await asyncio.create_subprocess_exec(
                        "python3", SCRIPT_PATHS[script], "-ss", date_str, "-se", date_str,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    RUNNING_PROCESSES[proc_key]["process"] = process # Store process object

                    async def stream_output(stream, prefix):
                        async for line in stream:
                            yield f"data: {prefix}{line.decode().strip()}\n\n"
                    
                    await asyncio.gather(
                        stream_output(process.stdout, f"[{script}] "),
                        stream_output(process.stderr, f"[{script}][ERROR] ")
                    )
                    
                    await process.wait()
                    yield f"data: Finished {script} for {date_str} with code {process.returncode}\n\n"
                
                current_dt += timedelta(days=1)

        finally:
            if proc_key in RUNNING_PROCESSES:
                del RUNNING_PROCESSES[proc_key]
            yield f"data: Process key '{proc_key}' deregistered. Execution finished.\n\n"
            yield "data: [DONE]\n\n"

    # Register the process
    RUNNING_PROCESSES[proc_key] = {
        "process": None, # Will be set once the subprocess starts
        "start_date": start_date,
        "end_date": end_date
    }
    return StreamingResponse(stream_logs(), media_type="text/event-stream")

@app.get("/admin/execution-status")
async def execution_status():
    """Returns the currently running scripts."""
    running_scripts = {}
    for key, value in RUNNING_PROCESSES.items():
        running_scripts[key] = {
            "start_date": value["start_date"],
            "end_date": value["end_date"],
            "pid": value["process"].pid if value["process"] else None
        }
    return running_scripts

@app.get("/admin/kill-script")
async def kill_script(script_name: str):
    """Kills a running script by its key."""
    if script_name not in RUNNING_PROCESSES:
        return JSONResponse(status_code=404, content={"error": f"Script '{script_name}' not found or not running."})

    proc_info = RUNNING_PROCESSES[script_name]
    process = proc_info.get("process")

    if process and process.pid:
        try:
            os.kill(process.pid, signal.SIGTERM) # Send SIGTERM for graceful shutdown
            # Clean up immediately
            del RUNNING_PROCESSES[script_name]
            return {"message": f"Sent kill signal to script '{script_name}' (PID: {process.pid})."}
        except ProcessLookupError:
            del RUNNING_PROCESSES[script_name]
            return {"message": f"Process for script '{script_name}' was already gone."}
    else:
        # If process object doesn't exist yet but the key does
        del RUNNING_PROCESSES[script_name]
        return {"message": f"Script '{script_name}' was registered but process not started. Removed registration."}


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
        date_str_display = current_dt.strftime("%Y-%-m-%-d")
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
