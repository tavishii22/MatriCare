from pydantic import BaseModel
from typing import Optional

class AuthPayload(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    password: str

class AshaSignupPayload(BaseModel):
    email: str
    password: str
    name: str
    phone_no: str
    address: str
    worker_id: str
    assigned_villages: str
    qualification: str
    supervisor: str
    government_id: str

class AdminSignupPayload(BaseModel):
    email: str
    password: str
    name: str
    phone_no: str
    admin_id: str
    department: str
    designation: str
    government_id: str