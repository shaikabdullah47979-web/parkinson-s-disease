# Model Card: Parkinson's Voice Dysphonia Classifier

## 1. Model Details
- **Selected Model**: Gradient Boosting Classifier
- **Algorithm**: `GradientBoostingClassifier`
- **Pipeline Preprocessing**: `StandardScaler` (zero mean, unit variance fitted strictly on training subjects)
- **Training Date (UTC)**: 2026-10-27T20:55:28.890163+00:00
- **Primary Objective**: Classify biomedical voice acoustic features into Parkinson's Disease (dysphonia) vs. healthy vocal patterns.

## 2. Validation Protocol & Data Leakage Prevention
- **Validation Method**: Subject-grouped split (`GroupShuffleSplit` for holdout, `StratifiedGroupKFold` for CV).
- **Training Cohort**: 146 voice recordings from 24 subjects.
- **Held-Out Cohort**: 49 voice recordings from 8 *completely unseen* subjects.
- **Why Grouping Matters**: Naive random splitting causes the same participant's recordings to appear in both training and test sets, artificially inflating apparent accuracy to >95% while failing on new subjects. Grouped validation provides genuine generalization metrics.

## 3. Evaluation on Held-Out Test Subjects

| Metric | Score | Explanation |
|---|---|---|
| **Accuracy** | 77.55% | Overall proportion of correct predictions across unseen subjects |
| **Sensitivity / Recall** | 100.00% | Proportion of actual PD recordings correctly identified (critical to minimize false negatives) |
| **Specificity** | 8.33% | Proportion of healthy control recordings correctly identified |
| **F1-Score** | 0.8706 | Harmonic mean of precision and recall |
| **ROC-AUC** | 0.7736 | Area under the Receiver Operating Characteristic curve |

### Confusion Matrix (Held-out Test Cohort)
- **True Negatives (Healthy classified as Healthy)**: 1
- **False Positives (Healthy classified as PD)**: 11
- **False Negatives (PD classified as Healthy)**: 0
- **True Positives (PD classified as PD)**: 37

## 4. Candidate Model Comparison (Held-out Test Cohort)

| Model | Accuracy | Sensitivity (Recall) | Specificity | F1-Score | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression (Baseline) | 63.3% | 83.8% | 0.0% | 0.775 | 0.633 |
| Support Vector Machine (RBF) | 67.3% | 89.2% | 0.0% | 0.805 | 0.376 |
| Random Forest Classifier | 71.4% | 94.6% | 0.0% | 0.833 | 0.723 |
| Gradient Boosting Classifier | 77.6% | 100.0% | 8.3% | 0.871 | 0.774 |

## 5. Top Predictive Features

| Rank | Feature | Importance / Weight | Clinical / Acoustic Interpretation |
|---|---|---|---|
| 1 | `spread1` | 0.5612 | Nonlinear dynamics / perturbation biomarker |
| 2 | `MDVP:Fo(Hz)` | 0.1294 | Nonlinear dynamics / perturbation biomarker |
| 3 | `RPDE` | 0.0840 | Nonlinear dynamics / perturbation biomarker |
| 4 | `spread2` | 0.0634 | Nonlinear dynamics / perturbation biomarker |
| 5 | `MDVP:Fhi(Hz)` | 0.0588 | Nonlinear dynamics / perturbation biomarker |
| 6 | `D2` | 0.0478 | Nonlinear dynamics / perturbation biomarker |
| 7 | `PPE` | 0.0263 | Nonlinear dynamics / perturbation biomarker |
| 8 | `HNR` | 0.0069 | Nonlinear dynamics / perturbation biomarker |

## 6. Ethical and Clinical Limitations
- **Intended Use**: Academic research, educational demonstration, and machine learning pedagogy.
- **Prohibited Uses**: Clinical diagnosis, triage decisions, self-diagnosis, or altering medical therapy.
- **Acoustic Nuance**: Voice measurements can be confounded by laryngitis, respiratory conditions, aging, or recording equipment noise.
