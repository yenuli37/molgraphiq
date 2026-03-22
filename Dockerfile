FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU version first
RUN pip install --no-cache-dir torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu

# Install PyG
RUN pip install --no-cache-dir torch-geometric==2.4.0

# Install torch-scatter and torch-sparse from PyG wheels
RUN pip install --no-cache-dir torch-scatter torch-sparse -f https://data.pyg.org/whl/torch-2.1.0+cpu.html

# Install remaining dependencies
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests numpy rdkit deepchem

COPY molgraphiq-api/ ./molgraphiq-api/
COPY molgraphiq_models/ ./molgraphiq_models/
COPY dist/ ./dist/

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "molgraphiq-api.main:app", "--host", "0.0.0.0", "--port", "8080"]
