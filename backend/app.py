import os
import subprocess
import tempfile
import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="StudyMate API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS_FILE = "users.json"

def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def track_user(request: Request, action: str, **kwargs):
    """Track user activity"""
    users = load_users()
    user_id = request.headers.get('x-user-id', str(uuid.uuid4()))
    
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        user = {
            'id': user_id,
            'first_seen': datetime.now().isoformat(),
            'actions': []
        }
        users.append(user)
    
    user['actions'].append({
        'action': action,
        'timestamp': datetime.now().isoformat(),
        'ip': request.client.host if request.client else None,
        **kwargs
    })
    
    user['actions'] = user['actions'][-50:]
    
    save_users(users)
    return user_id

@app.get("/health")
def health() -> dict:
    return {"ok": True}

@app.get("/stats")
def stats() -> dict:
    """Get user statistics"""
    users = load_users()
    total_users = len(users)
    total_questions = sum(len(u['actions']) for u in users)
    recent_users = len([u for u in users 
                       if datetime.fromisoformat(u['first_seen']) > datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)])
    
    return {
        "total_users": total_users,
        "total_questions": total_questions,
        "users_today": recent_users,
        "last_updated": datetime.now().isoformat()
    }

@app.post("/ask")
async def ask(request: Request, pdf: UploadFile = File(...), question: str = Form(...), model: Optional[str] = Form(None)):
    """
    Accepts a PDF and a question, invokes existing main.py, and returns the answer.
    Expects main.py to accept CLI args and print answer to stdout (plain or JSON).
    """
    user_id = track_user(request, "ask_question", 
                        pdf_name=pdf.filename, 
                        question_length=len(question),
                        model=model)
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await pdf.read()
            tmp.write(content)
            pdf_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {e}")

    script_path = os.path.abspath(os.path.join(os.getcwd(), "main.py"))
    if not os.path.exists(script_path):
        alt_path = os.path.abspath(os.path.join(os.getcwd(), "backend", "main.py"))
        if os.path.exists(alt_path):
            script_path = alt_path
        else:
            os.unlink(pdf_path)
            raise HTTPException(status_code=500, detail="main.py not found in project root or backend/")

    cmd = [
        "python",
        script_path,
        "--pdf",
        pdf_path,
        "--question",
        question,
    ]
    if model:
        cmd += ["--model", model]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False, timeout=600)
    except subprocess.TimeoutExpired:
        os.unlink(pdf_path)
        raise HTTPException(status_code=504, detail="PDF QA timed out")
    finally:
        try:
            os.unlink(pdf_path)
        except Exception:
            pass

    if proc.returncode != 0:
        raise HTTPException(status_code=500, detail=f"main.py error: {proc.stderr.strip() or proc.stdout.strip()}")

    out = (proc.stdout or "").strip()
    answer = out
    try:
        import json

        data = json.loads(out)
        if isinstance(data, dict) and "answer" in data:
            answer = str(data["answer"])
    except Exception:
        pass

    track_user(request, "answer_received", 
              pdf_name=pdf.filename, 
              answer_length=len(answer),
              user_id=user_id)
    
    return JSONResponse({"answer": answer, "user_id": user_id})

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
