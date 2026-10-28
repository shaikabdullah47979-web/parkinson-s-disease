# API Documentation: Parkinson's ML Platform

Base URL: `http://localhost:8000/api/v1`
Interactive Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

## Endpoints Summary

### Health
- `GET /health`: Returns service status, ML model loading status, and database connectivity.

### Dataset
- `GET /dataset/status`: Summary of the UCI dataset (row count, column count, subjects, missing values).
- `GET /dataset/features`: Returns all 22 acoustic features with descriptions, units, and baseline statistics.

### Model
- `GET /model/status`: Returns current loaded model name, timestamp, and status.
- `GET /model/metrics`: Returns test accuracy, sensitivity, specificity, F1-score, ROC-AUC, confusion matrix, and feature importances.
- `GET /model/comparison`: Returns performance comparisons across all candidate models (Logistic Regression, SVM, Random Forest, Gradient Boosting).

### Authentication
- `POST /auth/register`: Register new researcher (`email`, `password`, `full_name`). Returns JWT access token.
- `POST /auth/login`: Form-encoded login (`username`, `password`). Returns JWT access token.
- `GET /auth/me`: Retrieves current authenticated user profile.

### Prediction & History
- `POST /predict`: Submit 22 acoustic features. Returns classification result, confidence score, class probabilities, and medical disclaimer. Automatically associates with logged-in user if token provided.
- `GET /predictions`: List past prediction audit records for authenticated user.
- `GET /predictions/{id}`: Retrieve detailed record including raw input features.
- `DELETE /predictions/{id}`: Delete record from user's history.

