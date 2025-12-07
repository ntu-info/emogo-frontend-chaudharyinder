import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Initialize the SQLite database and create the records table if it doesn't exist.
 * @returns {Promise<void>}
 */
export async function initDatabase() {
    try {
        db = await SQLite.openDatabaseAsync('emogo.db');

        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood TEXT,
        latitude REAL,
        longitude REAL,
        placeName TEXT,
        videoUri TEXT
      );
    `);

        // Migration: Add placeName column if it doesn't exist
        try {
            await db.execAsync(`
        ALTER TABLE records ADD COLUMN placeName TEXT;
      `);
            console.log('Added placeName column to existing database');
        } catch (error) {
            // Column already exists, which is fine
            if (!error.message.includes('duplicate column name')) {
                console.warn('Migration warning:', error.message);
            }
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

/**
 * Insert a new record into the database.
 * @param {Object} record - The record to insert
 * @param {string} record.date - ISO date string
 * @param {string} [record.mood] - Mood string (optional)
 * @param {number} [record.latitude] - Latitude (optional)
 * @param {number} [record.longitude] - Longitude (optional)
 * @param {string} [record.placeName] - Place name (optional)
 * @param {string} [record.videoUri] - Video URI (optional)
 * @returns {Promise<number>} - The ID of the inserted record
 */
export async function insertRecord({ date, mood = null, latitude = null, longitude = null, placeName = null, videoUri = null }) {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }

    try {
        const result = await db.runAsync(
            'INSERT INTO records (date, mood, latitude, longitude, placeName, videoUri) VALUES (?, ?, ?, ?, ?, ?)',
            [date, mood, latitude, longitude, placeName, videoUri]
        );

        console.log('Record inserted with ID:', result.lastInsertRowId);
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error inserting record:', error);
        throw error;
    }
}

/**
 * Get all records from the database.
 * @returns {Promise<Array>} - Array of all records
 */
export async function getAllRecords() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }

    try {
        const records = await db.getAllAsync('SELECT * FROM records ORDER BY date DESC');
        return records;
    } catch (error) {
        console.error('Error fetching records:', error);
        throw error;
    }
}

/**
 * Delete a record from the database by ID.
 * @param {number} id - Record ID to delete
 * @returns {Promise<void>}
 */
export async function deleteRecord(id) {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }

    try {
        await db.runAsync('DELETE FROM records WHERE id = ?', [id]);
        console.log('Record deleted with ID:', id);
    } catch (error) {
        console.error('Error deleting record:', error);
        throw error;
    }
}

/**
 * Get the database instance (for advanced operations if needed).
 * @returns {SQLite.SQLiteDatabase | null}
 */
export function getDatabase() {
    return db;
}
