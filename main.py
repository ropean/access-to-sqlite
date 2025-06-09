import sys
from src.convert import access_to_sqlite

def main():
    if len(sys.argv) == 3:
        # CLI mode
        access_file = sys.argv[1]
        sqlite_file = sys.argv[2]
    else:
        # IDE mode
        access_file = "INPUT.accdb"     #NOTE Update with your Access file path
        sqlite_file = "OUTPUT.sqlite"   #NOTE Update with your desired SQLite file path

    access_to_sqlite(access_file, sqlite_file)

if __name__ == "__main__":
    main()
