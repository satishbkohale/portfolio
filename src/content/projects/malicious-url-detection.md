---
ref: P2
title: Malicious URL detection with machine learning
summary: A Python classifier that labels URLs as malicious or benign from length, special characters, domain patterns and entropy.
description: Case study by Satish Kohale. A Python machine-learning classifier that flags malicious URLs from lexical features and entropy.
roles:
  - role: soc
    weight: primary
context: A machine-learning project focused on a first-pass signal for suspicious links.
problem: Analysts see many suspicious links. A quick signal from the URL alone helps decide which ones to investigate first.
approach:
  - Prepared and cleaned a labelled set of malicious and benign URLs.
  - "Engineered features from the URL string: length, special-character counts, domain patterns and entropy."
  - Trained and evaluated the classifier in Python.
tools:
  - Python
  - Machine learning
  - Feature engineering
outcome: A working end-to-end pipeline, covering preprocessing, feature engineering, training and evaluation.
frameworks:
  - "MITRE ATT&CK T1566.002: Spearphishing Link (the technique these URLs typically serve)"
featured: true
order: 2
todo:
  - "Add evaluation numbers: accuracy, precision, recall and false-positive rate on a held-out test set."
  - Name the dataset (source and size) and the model type.
  - Add the repository link.
  - Add dates.
---
