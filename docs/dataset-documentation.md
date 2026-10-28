# Parkinson's Disease Voice Dataset Documentation

## 1. Dataset Overview
- **Dataset Name**: Parkinsons Disease Telemonitoring Acoustic Dataset
- **Authoritative Source**: UCI Machine Learning Repository
- **URL**: [UCI ML Repository Parkinsons Dataset](https://archive.ics.uci.edu/dataset/174/parkinsons)
- **Creators**: Max Little, Patrick McSharry (University of Oxford), Eric Hunter, Lorraine Ramig (NCVS Denver)
- **Citation**: Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM. *'Suitability of dysphonia measurements for telemonitoring of Parkinson\'s disease'*, IEEE Transactions on Biomedical Engineering, 56(4):1015-1022, 2008.
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)

## 2. Dataset Structure and Dimensions
- **Total Records**: 195 sustained vowel phonation voice recordings
- **Total Columns**: 24 (excluding derived subject_id)
- **Total Participants**: 32 individuals
  - Parkinson's Disease (PD) Subjects: 24
  - Healthy Controls: 8
- **Recordings per Subject**: Averaging ~6 recordings per participant (range 6 to 7)
- **Missing Values**: 0 (Clean dataset; 0 missing values across all columns)
- **Duplicate Rows**: 0 full duplicate rows

## 3. Target Variable
- **Column Name**: `status`
- **Type**: Binary integer (`1` or `0`)
- **Positive Class (`1`)**: 147 recordings (75.4%) diagnosed with Parkinson's disease
- **Negative Class (`0`)**: 48 recordings (24.6%) healthy control participants

## 4. Feature Dictionary

| Feature Name | Data Type | Mean ± Std | Description |
|---|---|---|---|
| `MDVP:Fo(Hz)` | Float | 154.2286 ± 41.3901 | Average vocal fundamental frequency in Hertz |
| `MDVP:Fhi(Hz)` | Float | 197.1049 ± 91.4915 | Maximum vocal fundamental frequency in Hertz |
| `MDVP:Flo(Hz)` | Float | 116.3246 ± 43.5214 | Minimum vocal fundamental frequency in Hertz |
| `MDVP:Jitter(%)` | Float | 0.0062 ± 0.0048 | Multidimensional Voice Program (MDVP) percentage jitter (cycle-to-cycle frequency variation) |
| `MDVP:Jitter(Abs)` | Float | 0.0000 ± 0.0000 | Absolute jitter in microseconds |
| `MDVP:RAP` | Float | 0.0033 ± 0.0030 | Relative Amplitude Perturbation |
| `MDVP:PPQ` | Float | 0.0034 ± 0.0028 | Five-point Period Perturbation Quotient |
| `Jitter:DDP` | Float | 0.0099 ± 0.0089 | Average absolute difference of differences between jitter cycles |
| `MDVP:Shimmer` | Float | 0.0297 ± 0.0189 | MDVP local shimmer (cycle-to-cycle amplitude variation) |
| `MDVP:Shimmer(dB)` | Float | 0.2823 ± 0.1949 | MDVP local shimmer in decibels |
| `Shimmer:APQ3` | Float | 0.0157 ± 0.0102 | Three-point Amplitude Perturbation Quotient |
| `Shimmer:APQ5` | Float | 0.0179 ± 0.0120 | Five-point Amplitude Perturbation Quotient |
| `MDVP:APQ` | Float | 0.0241 ± 0.0169 | MDVP 11-point Amplitude Perturbation Quotient |
| `Shimmer:DDA` | Float | 0.0470 ± 0.0305 | Average absolute difference between consecutive shimmer amplitudes |
| `NHR` | Float | 0.0248 ± 0.0404 | Noise-to-Harmonics Ratio (ratio of acoustic noise to tonal energy) |
| `HNR` | Float | 21.8860 ± 4.4258 | Harmonics-to-Noise Ratio in dB (higher values indicate clearer voice) |
| `RPDE` | Float | 0.4985 ± 0.1039 | Recurrence Period Density Entropy (measure of vocal signal dynamical complexity) |
| `DFA` | Float | 0.7181 ± 0.0553 | Detrended Fluctuation Analysis (signal fractal scaling exponent) |
| `spread1` | Float | -5.6844 ± 1.0902 | Nonlinear fundamental frequency variation measure 1 |
| `spread2` | Float | 0.2265 ± 0.0834 | Nonlinear fundamental frequency variation measure 2 |
| `D2` | Float | 2.3818 ± 0.3828 | Correlation dimension (measure of signal attractor complexity) |
| `PPE` | Float | 0.2066 ± 0.0901 | Pitch Period Entropy (measure of dysphonia pitch period impairment) |

## 5. Critical Data Quality & Validation Findings
1. **Repeated Participant Measurements (Data Leakage Risk)**:
   Because each of the 31 subjects contributed multiple recordings (typically 6-7), randomly splitting records into train and test sets leads to **severe participant leakage** (records from the same person being present in both train and test). Models evaluated with naive random splitting appear artificially accurate (>95%), but fail to generalize to new patients.
   **Mitigation**: Group-aware cross-validation (`GroupKFold` or `GroupShuffleSplit`) grouped by subject ID is strictly enforced.

2. **Identifier Column Protection**:
   The `name` column (e.g. `phon_R01_S01_1`) encodes subject identifiers. It is strictly excluded from feature inputs during training and prediction inference.

3. **Class Imbalance**:
   The positive class represents ~75% of recordings. Accuracy alone is misleading; evaluation must track Sensitivity (Recall), Specificity, F1-Score, and ROC-AUC.

4. **Educational & Research Scope**:
   This dataset evaluates phonatory acoustic dysphonia in a research protocol. It is NOT a standalone diagnostic tool for clinical practice.
