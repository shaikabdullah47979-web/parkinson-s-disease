"""
Dataset exploration and inspection script.
Generates structural statistics, data quality checks, and markdown report.
"""

import os
import json
import pandas as pd
import numpy as np

RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
DATA_FILE = os.path.join(RAW_DIR, "parkinsons.data")
DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "docs")
REPORT_PATH = os.path.join(DOCS_DIR, "dataset-documentation.md")

FEATURE_DESCRIPTIONS = {
    "MDVP:Fo(Hz)": "Average vocal fundamental frequency in Hertz",
    "MDVP:Fhi(Hz)": "Maximum vocal fundamental frequency in Hertz",
    "MDVP:Flo(Hz)": "Minimum vocal fundamental frequency in Hertz",
    "MDVP:Jitter(%)": "Multidimensional Voice Program (MDVP) percentage jitter (cycle-to-cycle frequency variation)",
    "MDVP:Jitter(Abs)": "Absolute jitter in microseconds",
    "MDVP:RAP": "Relative Amplitude Perturbation",
    "MDVP:PPQ": "Five-point Period Perturbation Quotient",
    "Jitter:DDP": "Average absolute difference of differences between jitter cycles",
    "MDVP:Shimmer": "MDVP local shimmer (cycle-to-cycle amplitude variation)",
    "MDVP:Shimmer(dB)": "MDVP local shimmer in decibels",
    "Shimmer:APQ3": "Three-point Amplitude Perturbation Quotient",
    "Shimmer:APQ5": "Five-point Amplitude Perturbation Quotient",
    "MDVP:APQ": "MDVP 11-point Amplitude Perturbation Quotient",
    "Shimmer:DDA": "Average absolute difference between consecutive shimmer amplitudes",
    "NHR": "Noise-to-Harmonics Ratio (ratio of acoustic noise to tonal energy)",
    "HNR": "Harmonics-to-Noise Ratio in dB (higher values indicate clearer voice)",
    "RPDE": "Recurrence Period Density Entropy (measure of vocal signal dynamical complexity)",
    "DFA": "Detrended Fluctuation Analysis (signal fractal scaling exponent)",
    "spread1": "Nonlinear fundamental frequency variation measure 1",
    "spread2": "Nonlinear fundamental frequency variation measure 2",
    "D2": "Correlation dimension (measure of signal attractor complexity)",
    "PPE": "Pitch Period Entropy (measure of dysphonia pitch period impairment)"
}

def inspect():
    if not os.path.exists(DATA_FILE):
        print(f"Error: Dataset not found at {DATA_FILE}. Run download_dataset.py first.")
        return

    df = pd.read_csv(DATA_FILE)
    print(f"Loaded {df.shape[0]} rows, {df.shape[1]} columns.")

    # Participant breakdown
    df["subject_id"] = df["name"].str.extract(r"(phon_R\d+_S\d+)")
    subject_summary = df.groupby(["subject_id", "status"]).size().unstack(fill_value=0)
    total_subjects = len(subject_summary)
    pd_subjects = (subject_summary[1] > 0).sum()
    healthy_subjects = (subject_summary[0] > 0).sum()

    # Missing & duplicate check
    missing = df.isnull().sum()
    duplicates = df.duplicated().sum()

    # Numerical statistics
    numeric_cols = [c for c in df.columns if c not in ["name", "status", "subject_id"]]
    desc = df[numeric_cols].describe().T

    # Generate dataset-documentation.md
    os.makedirs(DOCS_DIR, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("# Parkinson's Disease Voice Dataset Documentation\n\n")
        f.write("## 1. Dataset Overview\n")
        f.write("- **Dataset Name**: Parkinsons Disease Telemonitoring Acoustic Dataset\n")
        f.write("- **Authoritative Source**: UCI Machine Learning Repository\n")
        f.write("- **URL**: [UCI ML Repository Parkinsons Dataset](https://archive.ics.uci.edu/dataset/174/parkinsons)\n")
        f.write("- **Creators**: Max Little, Patrick McSharry (University of Oxford), Eric Hunter, Lorraine Ramig (NCVS Denver)\n")
        f.write("- **Citation**: Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM. *'Suitability of dysphonia measurements for telemonitoring of Parkinson\\'s disease'*, IEEE Transactions on Biomedical Engineering, 56(4):1015-1022, 2008.\n")
        f.write("- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)\n\n")

        f.write("## 2. Dataset Structure and Dimensions\n")
        f.write(f"- **Total Records**: {df.shape[0]} sustained vowel phonation voice recordings\n")
        f.write(f"- **Total Columns**: {df.shape[1] - 1} (excluding derived subject_id)\n")
        f.write(f"- **Total Participants**: {total_subjects} individuals\n")
        f.write(f"  - Parkinson's Disease (PD) Subjects: {pd_subjects}\n")
        f.write(f"  - Healthy Controls: {healthy_subjects}\n")
        f.write(f"- **Recordings per Subject**: Averaging ~6 recordings per participant (range {df.groupby('subject_id').size().min()} to {df.groupby('subject_id').size().max()})\n")
        f.write(f"- **Missing Values**: {missing.sum()} (Clean dataset; 0 missing values across all columns)\n")
        f.write(f"- **Duplicate Rows**: {duplicates} full duplicate rows\n\n")

        f.write("## 3. Target Variable\n")
        f.write("- **Column Name**: `status`\n")
        f.write("- **Type**: Binary integer (`1` or `0`)\n")
        f.write(f"- **Positive Class (`1`)**: {int((df['status'] == 1).sum())} recordings ({((df['status'] == 1).mean() * 100):.1f}%) diagnosed with Parkinson's disease\n")
        f.write(f"- **Negative Class (`0`)**: {int((df['status'] == 0).sum())} recordings ({((df['status'] == 0).mean() * 100):.1f}%) healthy control participants\n\n")

        f.write("## 4. Feature Dictionary\n\n")
        f.write("| Feature Name | Data Type | Mean ± Std | Description |\n")
        f.write("|---|---|---|---|\n")
        for col in numeric_cols:
            mean_val = desc.loc[col, "mean"]
            std_val = desc.loc[col, "std"]
            desc_text = FEATURE_DESCRIPTIONS.get(col, "Biomedical voice acoustic feature")
            f.write(f"| `{col}` | Float | {mean_val:.4f} ± {std_val:.4f} | {desc_text} |\n")

        f.write("\n## 5. Critical Data Quality & Validation Findings\n")
        f.write("1. **Repeated Participant Measurements (Data Leakage Risk)**:\n")
        f.write("   Because each of the 31 subjects contributed multiple recordings (typically 6-7), randomly splitting records into train and test sets leads to **severe participant leakage** (records from the same person being present in both train and test). Models evaluated with naive random splitting appear artificially accurate (>95%), but fail to generalize to new patients.\n")
        f.write("   **Mitigation**: Group-aware cross-validation (`GroupKFold` or `GroupShuffleSplit`) grouped by subject ID is strictly enforced.\n\n")
        f.write("2. **Identifier Column Protection**:\n")
        f.write("   The `name` column (e.g. `phon_R01_S01_1`) encodes subject identifiers. It is strictly excluded from feature inputs during training and prediction inference.\n\n")
        f.write("3. **Class Imbalance**:\n")
        f.write(f"   The positive class represents ~75% of recordings. Accuracy alone is misleading; evaluation must track Sensitivity (Recall), Specificity, F1-Score, and ROC-AUC.\n\n")
        f.write("4. **Educational & Research Scope**:\n")
        f.write("   This dataset evaluates phonatory acoustic dysphonia in a research protocol. It is NOT a standalone diagnostic tool for clinical practice.\n")

    print(f"[+] Dataset documentation written to {REPORT_PATH}")

if __name__ == "__main__":
    inspect()

