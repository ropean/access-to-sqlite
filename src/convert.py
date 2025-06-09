import pyodbc
import pandas as pd
import sqlite3
import logging
import os
import warnings

# Silence the pandas I/O warning about using SQLAlchemy
warnings.simplefilter("ignore", category=UserWarning)

# Define the function to convert Access to SQLite
def access_to_sqlite(access_file, sqlite_file="OUTPUT.sqlite", log_file="conversion.log"):
    """
    Convert an Access database to SQLite.
    
    :param access_file: Path to the Access database file.
    :param sqlite_file: Path to the output SQLite database file.
    """
    # Setup
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s: %(message)s"
    )
    
    conn_str = (
        r"Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={os.path.abspath(access_file)};"
    )

    # Main conversion logic
    try:
        # Connect to Access
        logging.info(f"Connecting to Access DB: {access_file}")
        access_conn = pyodbc.connect(conn_str)
        cursor = access_conn.cursor()

        # Get table names
        table_names = [row.table_name for row in cursor.tables(tableType="TABLE")]
        logging.info(f"Found tables: {table_names}")

        # Connect to SQLite
        sqlite_conn = sqlite3.connect(sqlite_file)

        # Convert each table
        for i, table in enumerate(table_names, start=1):
            logging.info(f"Exporting table {i}/{len(table_names)}: {table}")
            df = pd.read_sql(f"SELECT * FROM [{table}]", access_conn)
            df.to_sql(table, sqlite_conn, if_exists="replace", index=False) # Use 'append' if you want to keep existing data
            logging.info(f"Finished writing {table} to {sqlite_file}")

        logging.info("All tables exported successfully.")

    except Exception as e:
        logging.error(f"Error during conversion: {e}")

    finally:
        try:
            access_conn.close()
            sqlite_conn.close()
        except:
            pass