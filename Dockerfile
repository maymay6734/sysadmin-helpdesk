FROM python:3.11-slim

# Create user with UID 1000 required by Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app

# Install dependencies
COPY --chown=user:user backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application files (FastAPI + static web app)
COPY --chown=user:user backend/ .

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
