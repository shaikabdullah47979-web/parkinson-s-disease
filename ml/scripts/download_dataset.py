"""
Dataset download and verification script for Parkinson's Disease Voice Dataset.
Authoritative source: UCI Machine Learning Repository
Citation:
Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM.
'Suitability of dysphonia measurements for telemonitoring of Parkinson's disease',
IEEE Transactions on Biomedical Engineering, 2008.
"""

import os
import sys
import json
import hashlib
import urllib.request
from datetime import datetime, timezone
import pandas as pd

UCI_DATA_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/parkinsons/parkinsons.data"
FALLBACK_URL = "https://raw.githubusercontent.com/marshaldave/Parkinsons-Disease-Detection-using-Machine-Learning/master/parkinsons.data"

RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
OUTPUT_PATH = os.path.join(RAW_DIR, "parkinsons.data")
METADATA_PATH = os.path.join(RAW_DIR, "dataset_metadata.json")

EXPECTED_COLUMNS = [
    "name", "MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)", "MDVP:Jitter(%)",
    "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ", "Jitter:DDP", "MDVP:Shimmer",
    "MDVP:Shimmer(dB)", "Shimmer:APQ3", "Shimmer:APQ5", "MDVP:APQ", "Shimmer:DDA",
    "NHR", "HNR", "status", "RPDE", "DFA", "spread1", "spread2", "D2", "PPE"
]

def calculate_checksums(filepath: str):
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            md5.update(chunk)
            sha256.update(chunk)
    return md5.hexdigest(), sha256.hexdigest()

def download_file(url: str, dest_path: str):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response, open(dest_path, "wb") as out_file:
        out_file.write(response.read())

def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    print(f"[*] Downloading dataset to {OUTPUT_PATH}...")
    
    downloaded = False
    download_url_used = None
    
    for url in [UCI_DATA_URL, FALLBACK_URL]:
        try:
            print(f"[*] Trying: {url}")
            download_file(url, OUTPUT_PATH)
            download_url_used = url
            downloaded = True
            print(f"[+] Successfully downloaded from {url}")
            break
        except Exception as e:
            print(f"[-] Failed downloading from {url}: {e}")

    if not downloaded or not os.path.exists(OUTPUT_PATH):
        print("ERROR: Failed to download dataset from all sources.")
        sys.exit(1)

    # Verification
    filesize = os.path.getsize(OUTPUT_PATH)
    md5, sha256 = calculate_checksums(OUTPUT_PATH)
    print(f"[+] File Size: {filesize} bytes")
    print(f"[+] MD5 Checksum: {md5}")
    print(f"[+] SHA256 Checksum: {sha256}")

    # Inspect with pandas
    try:
        df = pd.read_csv(OUTPUT_PATH)
    except Exception as e:
        print(f"ERROR: Cannot parse downloaded file as CSV: {e}")
        sys.exit(1)

    print(f"[+] Parsed dataset: {df.shape[0]} rows, {df.shape[1]} columns")
    
    # Verify columns
    missing_cols = set(EXPECTED_COLUMNS) - set(df.columns)
    if missing_cols:
        print(f"ERROR: Missing expected columns: {missing_cols}")
        sys.exit(1)

    print("[+] All 24 expected columns verified!")

    # Verify target distribution
    status_counts = df["status"].value_counts().to_dict()
    print(f"[+] Target 'status' counts: {status_counts}")
    # 1: Parkinson's, 0: Healthy controls

    # Verify participant identifiers
    # Format of name: phon_R01_S01_1 (S01 is participant id)
    df["subject_id"] = df["name"].str.extract(r"(phon_R\d+_S\d+)")
    unique_subjects = df["subject_id"].nunique()
    print(f"[+] Unique subjects identified: {unique_subjects} (Expected ~31 subjects)")

    metadata = {
        "dataset_name": "Parkinsons Disease Voice Dataset",
        "authoritative_source": "UCI Machine Learning Repository",
        "download_url": download_url_used,
        "citation": "Little MA, McSharry PE, Roberts SJ, Costello DAE, Moroz IM. 'Suitability of dysphonia measurements for telemonitoring of Parkinson's disease', IEEE Transactions on Biomedical Engineering, 2008.",
        "download_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "filesize_bytes": filesize,
        "md5_checksum": md5,
        "sha256_checksum": sha256,
        "row_count": int(df.shape[0]),
        "column_count": int(df.shape[1]),
        "columns": list(df.columns),
        "target_column": "status",
        "target_distribution": {str(k): int(v) for k, v in status_counts.items()},
        "unique_subjects": int(unique_subjects),
        "missing_values_count": int(df.isna().sum().sum()),
        "duplicate_rows_count": int(df.duplicated().sum())
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[+] Saved metadata to {METADATA_PATH}")
    print("[+] Dataset download and verification completed successfully!")

if __name__ == "__main__":
    main()

