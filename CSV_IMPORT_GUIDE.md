# CSV Import Guide for Supabase

## Method 1: Import via Supabase Dashboard (Recommended)

### Step 1: Prepare Your CSV

Your CSV should have these columns (in this order):
```csv
employee_id,employee_name,client_name,account_number,session_number,date,month,attendance,notes
3,Jim,ABC Company,12345,1,2026-02-14,2026-02,completed,Great session
4,Marc,XYZ Corp,67890,1,2026-02-13,2026-02,pending,
2,Danreb,Test Client,11111,2,2026-02-12,2026-02,no-show,Client didn't show up
```

**Column Details:**
- `employee_id` - Number (1=Rafael, 2=Danreb, 3=Jim, 4=Marc, 5=Steve, 6=Erick)
- `employee_name` - Text (Rafael, Danreb, Jim, Marc, Steve, or Erick)
- `client_name` - Text (any client name)
- `account_number` - Text (any account number)
- `session_number` - Number (1, 2, 3, etc.)
- `date` - Date format: YYYY-MM-DD (e.g., 2026-02-14)
- `month` - Text format: YYYY-MM (e.g., 2026-02)
- `attendance` - Text (pending, completed, cancelled, rescheduled, or no-show)
- `notes` - Text (optional, can be empty)

### Step 2: Import in Supabase

1. Go to your Supabase project
2. Click **"Table Editor"** in the left sidebar
3. Click on the **"onboardings"** table
4. Click **"Insert"** dropdown → **"Import data from CSV"**
5. Choose your CSV file
6. Map the columns (Supabase usually auto-detects)
7. Click **"Import"**

**Note:** The `id`, `created_at`, `updated_at` columns will be auto-generated.

---

## Method 2: Import via SQL (For Large Files)

If you have a lot of data (100+ rows), use SQL import:

### Step 1: Convert CSV to SQL

Create a file called `import-data.sql`:

```sql
-- Import onboarding sessions
INSERT INTO onboardings (
  employee_id,
  employee_name,
  client_name,
  account_number,
  session_number,
  date,
  month,
  attendance,
  notes
) VALUES
  (3, 'Jim', 'ABC Company', '12345', 1, '2026-02-14', '2026-02', 'completed', 'Great session'),
  (4, 'Marc', 'XYZ Corp', '67890', 1, '2026-02-13', '2026-02', 'pending', NULL),
  (2, 'Danreb', 'Test Client', '11111', 2, '2026-02-12', '2026-02', 'no-show', 'Client did not show up')
-- Add more rows as needed
;
```

### Step 2: Run SQL in Supabase

1. Go to **SQL Editor** in Supabase
2. Click **"New Query"**
3. Paste your SQL
4. Click **"Run"**

---

## Method 3: Import via JavaScript (Automated)

If you have your CSV data in the app already, use this script:

### Create Import Helper

Create a file `import-csv.js` in your project:

```javascript
import { SupabaseService } from './src/services/supabase.js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

async function importCSV(filePath) {
  // Read CSV file
  const csvContent = readFileSync(filePath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`📥 Importing ${records.length} sessions...`);

  let successCount = 0;
  let errorCount = 0;

  for (const record of records) {
    const onboarding = {
      employeeId: parseInt(record.employee_id),
      employeeName: record.employee_name,
      clientName: record.client_name,
      accountNumber: record.account_number,
      sessionNumber: parseInt(record.session_number),
      date: record.date,
      month: record.month,
      attendance: record.attendance || 'pending',
      notes: record.notes || undefined
    };

    const result = await SupabaseService.createOnboarding(onboarding);

    if (result.success) {
      successCount++;
      console.log(`✅ Imported: ${record.client_name}`);
    } else {
      errorCount++;
      console.error(`❌ Failed: ${record.client_name}`, result.error);
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run import
importCSV('./data.csv');
```

### Run the Import

```bash
node import-csv.js
```

---

## Method 4: Import from Google Sheets

If your data is in Google Sheets, you can import directly:

### Step 1: Export from Google Sheets

1. Open your Google Sheet
2. **File** → **Download** → **Comma Separated Values (.csv)**
3. Save the file

### Step 2: Follow Method 1 or 2 above

---

## Method 5: Bulk Import via App UI

Add this to your admin dashboard:

### Create Import Component

```jsx
import { SupabaseService } from '../services/supabase';
import { parse } from 'papaparse'; // npm install papaparse

function CSVImporter() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);

    // Parse CSV
    parse(file, {
      header: true,
      complete: async (results) => {
        let successCount = 0;
        let errorCount = 0;

        for (const row of results.data) {
          if (!row.client_name) continue; // Skip empty rows

          const onboarding = {
            employeeId: parseInt(row.employee_id),
            employeeName: row.employee_name,
            clientName: row.client_name,
            accountNumber: row.account_number,
            sessionNumber: parseInt(row.session_number),
            date: row.date,
            month: row.month,
            attendance: row.attendance || 'pending',
            notes: row.notes || undefined
          };

          const result = await SupabaseService.createOnboarding(onboarding);

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        }

        setResult({ successCount, errorCount });
        setImporting(false);
      }
    });
  };

  return (
    <div>
      <h3>Import CSV Data</h3>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={importing}
      />

      {importing && <p>Importing...</p>}

      {result && (
        <div>
          <p>✅ Imported: {result.successCount}</p>
          <p>❌ Failed: {result.errorCount}</p>
        </div>
      )}
    </div>
  );
}
```

---

## CSV Template

Download this template to format your data:

**onboarding-import-template.csv:**
```csv
employee_id,employee_name,client_name,account_number,session_number,date,month,attendance,notes
3,Jim,ABC Company,12345,1,2026-02-14,2026-02,completed,
4,Marc,XYZ Corp,67890,1,2026-02-13,2026-02,pending,
2,Danreb,Test Client,11111,1,2026-02-12,2026-02,no-show,Client did not attend
5,Steve,Another Corp,22222,1,2026-02-11,2026-02,completed,Great session
6,Erick,Sample Inc,33333,2,2026-02-10,2026-02,rescheduled,Moved to next week
1,Rafael,Demo Company,44444,1,2026-02-09,2026-02,cancelled,Client cancelled
```

---

## Common Issues & Solutions

### Issue: "duplicate key value violates unique constraint"
**Solution:** You're trying to import data that already exists. Either:
- Clear the table first: `DELETE FROM onboardings;`
- Or skip duplicates in your import script

### Issue: "invalid input syntax for type date"
**Solution:** Make sure dates are in YYYY-MM-DD format, not MM/DD/YYYY

### Issue: "null value in column violates not-null constraint"
**Solution:** Ensure these columns are never empty:
- employee_id
- employee_name
- client_name
- account_number
- date
- month

### Issue: "value too long for type character varying"
**Solution:** Some field is too long. Check:
- employee_name: max 100 characters
- client_name: max 255 characters
- account_number: max 100 characters

---

## Employee ID Reference

```
1 = Rafael
2 = Danreb
3 = Jim
4 = Marc
5 = Steve
6 = Erick
```

---

## Example: Import from Excel

If you have an Excel file:

1. **Open in Excel**
2. **Save As** → **CSV (Comma delimited) (*.csv)**
3. Follow **Method 1** above

---

## Verify Import

After importing, verify in Supabase:

1. Go to **Table Editor**
2. Click **onboardings** table
3. Check row count
4. Review a few rows to confirm data looks correct

Or run SQL:
```sql
-- Count total records
SELECT COUNT(*) FROM onboardings;

-- Check by employee
SELECT employee_name, COUNT(*) as session_count
FROM onboardings
GROUP BY employee_name
ORDER BY session_count DESC;

-- Check recent imports
SELECT * FROM onboardings
ORDER BY created_at DESC
LIMIT 10;
```

---

## My Recommendation

**For your first import:**
1. Use **Method 1** (Supabase Dashboard) - easiest and visual
2. If you have more than 100 rows, use **Method 2** (SQL) - faster

**For ongoing imports:**
- Add **Method 5** (App UI) to your admin dashboard
- Lets you import CSVs without leaving the app

---

Your data will be imported and ready to use! 🎉
