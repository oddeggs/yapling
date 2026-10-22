
**main (86)**

| Rule | Outcome (6-way) | Runner event | False fine | False not-fine | Missed target error | Same event in all 3 runs |
|---|---|---|---|---|---|---|
| Haiku 5.5, call path (case tag) | 85.7% | 88.8% | 14/117 | 9/129 | 6/12 | 83/86 |
| Jev v1 untuned: argmax, targets ≥ 0.5 | 90.3% | 91.5% | 13/117 | 6/129 | 3/12 | 83/86 |
| Jev v2: argmax both orders, targets ≥ 0.35 | 91.9% | 93.0% | 18/117 | 0/129 | 0/12 | 82/86 |
| Jev v2: fine ≥ 0.7, targets ≥ 0.35 | 93.8% | 95.0% | 4/117 | 6/129 | 3/12 | 85/86 |
| Jev v2: fine ≥ 0.7, garbled ≥ 0.5 → unclear, targets ≥ 0.35 | 92.6% | 95.0% | 4/117 | 6/129 | 3/12 | 85/86 |
| Jev v2: fine ≥ 0.5 & hoped ≥ 0.5, targets ≥ 0.35 | 96.1% | 97.3% | 4/117 | 3/129 | 0/12 | 85/86 |
| Jev v2: fine ≥ 0.5 & hoped ≥ 0.5, garbled ≥ 0.5 → unclear, targets ≥ 0.35 | 95.0% | 97.3% | 4/117 | 3/129 | 0/12 | 85/86 |
| Jev v2 + Haiku: fine only if both say fine | 93.0% | 95.3% | 0/117 | 9/129 | 3/12 | 86/86 |

**holdout (30)**

| Rule | Outcome (6-way) | Runner event | False fine | False not-fine | Missed target error | Same event in all 3 runs |
|---|---|---|---|---|---|---|
| Haiku 5.5, call path (case tag) | 88.9% | 88.9% | 6/42 | 1/42 | 3/6 | 29/30 |
| Jev v1 untuned: argmax, targets ≥ 0.5 | 96.7% | 96.7% | 3/42 | 0/42 | 0/6 | 30/30 |
| Jev v2: argmax both orders, targets ≥ 0.35 | 93.3% | 96.7% | 3/42 | 0/42 | 0/6 | 30/30 |
| Jev v2: fine ≥ 0.7, targets ≥ 0.35 | 95.6% | 98.9% | 0/42 | 1/42 | 0/6 | 29/30 |
| Jev v2: fine ≥ 0.7, garbled ≥ 0.5 → unclear, targets ≥ 0.35 | 95.6% | 98.9% | 0/42 | 1/42 | 0/6 | 29/30 |
| Jev v2: fine ≥ 0.5 & hoped ≥ 0.5, targets ≥ 0.35 | 93.3% | 96.7% | 3/42 | 0/42 | 0/6 | 30/30 |
| Jev v2: fine ≥ 0.5 & hoped ≥ 0.5, garbled ≥ 0.5 → unclear, targets ≥ 0.35 | 96.7% | 100.0% | 0/42 | 0/42 | 0/6 | 30/30 |
| Jev v2 + Haiku: fine only if both say fine | 94.4% | 97.8% | 0/42 | 2/42 | 0/6 | 28/30 |
