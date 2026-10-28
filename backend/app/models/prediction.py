from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class PredictionRecord(Base):
    __tablename__ = "prediction_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    model_name = Column(String(100), nullable=False)
    input_features = Column(JSON, nullable=False)
    prediction_label = Column(Integer, nullable=False)  # 0 or 1
    prediction_text = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    notes = Column(String(500), nullable=True)

    user = relationship("User", back_populates="predictions")

