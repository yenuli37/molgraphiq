FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    libxrender1 \
    libxext6 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir numpy==1.26.4
RUN pip install --no-cache-dir torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir torch-geometric==2.4.0
RUN pip install --no-cache-dir torch-scatter torch-sparse -f https://data.pyg.org/whl/torch-2.1.0+cpu.html
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests rdkit deepchem

COPY molgraphiq-api/ ./molgraphiq_api/
COPY molgraphiq_models/ ./molgraphiq_models/
COPY dist/ ./dist/

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "molgraphiq_api.main:app", "--host", "0.0.0.0", "--port", "8080"]
