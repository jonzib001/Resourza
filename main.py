from fastapi import FastAPI, BackgroundTasks, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import shutil
import uuid
from crawl import initcrawl 

app = FastAPI(title="Paper Scraper API")

# --- CORS Security Setup ---
# THE FIX: We updated the CORS middleware to globally allow exposed headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
    expose_headers=["Content-Length"] # This is crucial for React to see the file size
)

class ScrapeRequest(BaseModel):
    subject_code: str 
    start_year: int 
    end_year: int 
    selected_papers: list[int | str] 
    selected_variants: list[str]

try:
    with open("subjects_database.json", "r") as db_file:
        SUBJECT_DATABASE = json.load(db_file)
except FileNotFoundError:
    print("WARNING: subjects_database.json not found! Please create it.")
    SUBJECT_DATABASE = {}

def cleanup_workspace(directory_path: str):
    try:
        if os.path.exists(directory_path):
            shutil.rmtree(directory_path, ignore_errors=True)
            print(f"\n[CLEANUP] Successfully deleted {directory_path}")
    except Exception as e:
        print(f"\n[CLEANUP] Error deleting {directory_path}: {e}")

# --- The Database Route ---
@app.get("/api/subjects")
def get_subjects():
    return SUBJECT_DATABASE

@app.post("/api/download")
def download_papers(req: ScrapeRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    temp_dir = f"temp_workspace_{session_id}"
    download_dir = f"{temp_dir}/downloads"
    os.makedirs(download_dir, exist_ok=True)

    subject_info = SUBJECT_DATABASE.get(req.subject_code)
    if not subject_info:
        return {"error": f"Subject code {req.subject_code} not found in database"}

    normalized_requests = [str(int(p)) for p in req.selected_papers]

    requested_components = [
        comp for comp in subject_info["components"] 
        if str(int(comp["paper"])) in normalized_requests
    ]

    # --- VARIANT LOGIC ---
    if "All" in req.selected_variants:
        final_variants = [1, 2, 3, "", "0"]
    else:
        final_variants = [int(v) for v in req.selected_variants] + ["", "0"]

    formatted_components = []
    for comp in requested_components:
        formatted_components.append({
            "name": comp["name"],
            "code": req.subject_code,
            "duration": comp["duration"],
            "total_marks": comp["total_marks"],
            "paper": comp["paper"]
        })

    config = {
        "code": req.subject_code,
        "name": subject_info["name"],
        "short_name": subject_info["short_name"],
        "type": subject_info["type"],
        "yearstart": req.start_year,
        "yearend": req.end_year,
        "info": {
            "duration": subject_info["info_duration"],
            "total_marks": subject_info["info_total_marks"],
            "components": formatted_components,
            "variants": final_variants 
        },
        "urldata": {
            "url": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
    }

    config_string = json.dumps(config)
    print(f"\nStarting download for {req.subject_code}...")
    initcrawl(formatraw=config_string, directory=download_dir)

    print("\nDownloads finished! Zipping files now...")
    base_zip_path = os.path.abspath(os.path.join(temp_dir, f"CAIE_{req.subject_code}_Papers"))
    target_dir = os.path.abspath(download_dir)
    shutil.make_archive(base_zip_path, 'zip', target_dir)
    final_zip_file = f"{base_zip_path}.zip"
    print(f"SUCCESS! Zip file created.")

    background_tasks.add_task(cleanup_workspace, os.path.abspath(temp_dir))

    # --- THE FIX: Calculate size and attach custom headers to the FileResponse ---
    file_size = os.path.getsize(final_zip_file)
    
    headers = {
        "Content-Length": str(file_size),
        "Access-Control-Expose-Headers": "Content-Length"
    }

    return FileResponse(
        path=final_zip_file, 
        filename=f"CAIE_{req.subject_code}_Papers.zip", 
        media_type="application/zip",
        headers=headers
    )