# Access to SQLite Converter

This tool converts Microsoft Access `.accdb` to a SQLite `.db`, exporting **all tables** and logging the conversion process.

## 📦 Features

- Converts all tables in a `.accdb` file to a single `.sqlite` database
- Uses `pyodbc` to read from Access and `pandas` to write to SQLite
- Logs each step of the process with timestamps
- Works on **Windows only** (requires Access Database Engine)

---

## 🚀 Requirements

- **Windows OS**
- Python 3.7+
- [Microsoft Access Database Engine](https://www.microsoft.com/en-us/download/details.aspx?id=54920)

---

## 🛠️ How to Use

Clone the repo and install dependencies:

```bash
git clone https://github.com/bofethe/access-to-sqlite.git
cd access-to-sqlite
```

### CLI Mode

Open a terminal with an activated python environment containing the libraries listed in [requirements](requirements.txt). If you need to install these, run the following:
```bash
pip install -r requirements.txt
```

Run the following line with the relative or absolute paths to you Access database and the desired output for the SQLite database.
```bash
python main.py INPUT.accdb OUTPUT.sqlite
```

### IDE Mode
Update the lines 11 and 12 in [main](main.py) with the relative or absolute paths to you Access database and the desired output for the SQLite database. For clarification, both lines are maked with #NOTE. Run the script.

### Logging
A detailed event log is saved in the root folder in [conversion](conversion.log).