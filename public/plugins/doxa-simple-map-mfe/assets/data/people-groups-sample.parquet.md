# people-groups-sample.parquet — placeholder

This file should be replaced with a real Parquet binary.

To generate a sample from a CSV:
```bash
python3 -c "
import pandas as pd
df = pd.read_csv('people-groups-sample.csv')
df.to_parquet('people-groups-sample.parquet', index=False)
"
```

Or download from the shared team drive and drop it here.
The column schema is documented in `README.md`.
