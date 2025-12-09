import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow CORS for the extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load personal data
try:
    with open("personal_data.json", "r") as f:
        PERSONAL_DATA = json.load(f)
except FileNotFoundError:
    PERSONAL_DATA = {}
    print("Warning: personal_data.json not found.")

class FieldInfo(BaseModel):
    question: str
    selector: str
    type: str
    name: str
    id: str
    placeholder: str = ""
    options: Optional[List[dict]] = None

    class Config:
        extra = "ignore"

class FieldAnswer(FieldInfo):
    answer: str = ""

class FormRequest(BaseModel):
    fields: List[FieldInfo]

from agent import process_form_with_llm

@app.post("/generate-answers", response_model=List[FieldAnswer])
async def generate_answers(request: FormRequest):
    # Convert Pydantic models to list of dicts
    fields_dict = [field.dict() for field in request.fields]
    
    # Process with LLM
    answered_fields_dict = process_form_with_llm(fields_dict, PERSONAL_DATA)
    
    # Convert back to Pydantic models
    answered_fields = [FieldAnswer(**field) for field in answered_fields_dict]
        
    return answered_fields

@app.get("/")
async def root():
    return {"message": "Auto Apply RAG Backend is running"}
