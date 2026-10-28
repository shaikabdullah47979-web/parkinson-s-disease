# Machine Learning Pipeline: Parkinson's Dysphonia Classification

## Dataset
- **Source**: UCI Machine Learning Repository (Parkinsons Telemonitoring)
- **Samples**: 195 sustained vowel phonations across 32 unique subjects (147 PD, 48 Healthy)
- **Features**: 22 vocal fold perturbation acoustic measures (Jitter, Shimmer, HNR, RPDE, DFA, spread1, spread2, D2, PPE)

## Leakage Prevention Protocol
Because each participant provided multiple recordings, standard random splitting causes participant leakage.
This pipeline uses:
- `GroupShuffleSplit` by participant ID for the holdout test set (unseen subjects).
- `StratifiedGroupKFold` (4 folds) for internal cross-validation.

## Candidate Models Evaluated
1. **Logistic Regression** (Baseline)
2. **Support Vector Machine** (RBF Kernel)
3. **Random Forest Classifier**
4. **Gradient Boosting Classifier** (Champion: 77.6% Test Accuracy, 100% Sensitivity/Recall, 0.871 F1-score)

## Pipeline Scripts
```powershell
# 1. Download & verify dataset:
python ml/scripts/download_dataset.py

# 2. Inspect dataset:
python ml/scripts/inspect_dataset.py

# 3. Train, evaluate & save champion model:
python ml/scripts/train_models.py

# 4. Run ML integrity tests:
python -m pytest ml/tests/test_ml.py -v
```

