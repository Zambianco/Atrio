FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/
RUN chown -R app:app /app

USER app

EXPOSE 8000

CMD ["gunicorn", "Atrio.wsgi:application", "--bind", "0.0.0.0:8000"]
