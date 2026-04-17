"""
API para persistência de dados do Núcleo de Canarana.
Endpoints granulares (PUT/DELETE por registro) + snapshot (GET/POST /dados).
"""
import json
import os
import threading
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

DATA_FILE = Path(os.getenv("DATA_FILE", "/data/dados.json"))
_lock = threading.Lock()

app = FastAPI(title="SIGES-BM Canarana API", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def ler() -> dict:
    if not DATA_FILE.exists():
        return {"militares": [], "valores": [], "jornadas": [], "recursos": []}
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def gravar(dados: dict):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")


class Payload(BaseModel):
    dados: Any


# ---- Snapshot (compatibilidade + import Excel) ----

@app.get("/dados")
def get_dados():
    return ler()


@app.post("/dados")
def post_dados(payload: Payload):
    with _lock:
        try:
            gravar(payload.dados)
            return {"ok": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ---- Helpers para endpoints granulares ----

def _upsert(collection: str, key_field: str, item_id: str, body: dict):
    with _lock:
        dados = ler()
        lista = dados.setdefault(collection, [])
        idx = next((i for i, x in enumerate(lista) if x.get(key_field) == item_id), None)
        if idx is not None:
            lista[idx] = body
        else:
            lista.append(body)
        gravar(dados)
    return {"ok": True}


def _delete(collection: str, key_field: str, item_id: str):
    with _lock:
        dados = ler()
        antes = len(dados.get(collection, []))
        dados[collection] = [x for x in dados.get(collection, []) if x.get(key_field) != item_id]
        if len(dados[collection]) == antes:
            raise HTTPException(404, f"{collection}: item não encontrado")
        gravar(dados)
    return {"ok": True}


# ---- Jornadas ----

@app.put("/jornadas/{jornada_id}")
async def upsert_jornada(jornada_id: str, request: Request):
    body = await request.json()
    body["id"] = jornada_id
    return _upsert("jornadas", "id", jornada_id, body)


@app.delete("/jornadas/{jornada_id}")
def delete_jornada(jornada_id: str):
    return _delete("jornadas", "id", jornada_id)


# ---- Recursos ----

@app.put("/recursos/{recurso_id}")
async def upsert_recurso(recurso_id: str, request: Request):
    body = await request.json()
    body["id"] = recurso_id
    return _upsert("recursos", "id", recurso_id, body)


@app.delete("/recursos/{recurso_id}")
def delete_recurso(recurso_id: str):
    return _delete("recursos", "id", recurso_id)


# ---- Militares ----

@app.put("/militares/{militar_id}")
async def upsert_militar(militar_id: str, request: Request):
    body = await request.json()
    body["id"] = militar_id
    return _upsert("militares", "id", militar_id, body)


@app.delete("/militares/{militar_id}")
def delete_militar(militar_id: str):
    return _delete("militares", "id", militar_id)


# ---- Valores (chave = posto) ----

@app.put("/valores/{posto}")
async def upsert_valor(posto: str, request: Request):
    body = await request.json()
    body["posto"] = posto
    return _upsert("valores", "posto", posto, body)


@app.get("/health")
def health():
    return {"ok": True}
