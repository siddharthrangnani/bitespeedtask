const sqlite3 = require('sqlite3').verbose();

function createContactsTable() {

    const db = new sqlite3.Database('mydb.sqlite', (err) => {
        if (err) {
            console.error('Error connecting to SQLite database:', err.message);
        } else {
            console.log('Connected to SQLite database.');
        }
    });

 
    const checkTableQuery = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='Contacts';
    `;

    db.get(checkTableQuery, (err, row) => {
        if (err) {
            console.error('Error checking for Contacts table:', err.message);
        } else if (row) {
            console.log('Contacts table already exists.');
        } else {
            // SQL query to create the Contacts table
            const createTableQuery = `
                CREATE TABLE Contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phoneNumber TEXT,
                    email TEXT,
                    linkedId INTEGER,
                    linkPrecedence TEXT CHECK(linkPrecedence IN ('secondary', 'primary')),
                    createdAt DATETIME NOT NULL,
                    updatedAt DATETIME NOT NULL,
                    deletedAt DATETIME DEFAULT NULL,
                    FOREIGN KEY (linkedId) REFERENCES Contacts(id) ON DELETE SET NULL
                );
            `;

            // Execute the query
            db.run(createTableQuery, (err) => {
                if (err) {
                    console.error('Error creating Contacts table:', err.message);
                } else {
                    console.log('Contacts table created successfully.');
                }
            });
        }
    });
   
    db.serialize(() => {
function insertMockData() {
    const mockData = [
        {
            id: 1,
            phoneNumber: "123456",
            email: "lorraine@hillvalley.edu",
            linkedId: null,
            linkPrecedence: "primary",
            createdAt: "2023-04-01 00:00:00",
            updatedAt: "2023-04-01 00:00:00",
            deletedAt: null
        },
        {
            id: 23,
            phoneNumber: "123456",
            email: "mcfly@hillvalley.edu",
            linkedId: 1,
            linkPrecedence: "secondary",
            createdAt: "2023-04-20 05:30:00",
            updatedAt: "2023-04-20 05:30:00",
            deletedAt: null
        }
    ];

    const insertQuery = `
        INSERT INTO Contacts (
            id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;

    // Loop through mock data and insert each row
    mockData.forEach((contact) => {
        db.run(insertQuery, [
            contact.id,
            contact.phoneNumber,
            contact.email,
            contact.linkedId,
            contact.linkPrecedence,
            contact.createdAt,
            contact.updatedAt,
            contact.deletedAt
        ], (err) => {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    console.log(`Record with ID ${contact.id} already exists.`);
                } else {
                    console.error(`Error inserting record with ID ${contact.id}:`, err.message);
                }
            } else {
                console.log(`Inserted record with ID ${contact.id}`);
            }
        });
    });
}

        insertMockData();
});
    // Close the database connection
    
}

// Call the function to create the table
createContactsTable();

