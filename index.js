const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
app.use(express.json());

const db = new sqlite3.Database('mydb.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

app.post('/identity', (req, res) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "At least one of email or phoneNumber is required" });
    }

    const query = `
        SELECT * FROM Contacts
        WHERE (email = ? OR phoneNumber = ?)
          AND deletedAt IS NULL;
    `;

    db.all(query, [email, phoneNumber], (err, rows) => {
        if (err) {
            console.error('Error querying database:', err.message);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: "No matching contact found" });
        }

        const primaryContact = rows.find(row => row.linkPrecedence === 'primary') || rows[0];
        const primaryContactId = primaryContact.id;

        const emails = [primaryContact.email];
        const phoneNumbers = [primaryContact.phoneNumber];
        const secondaryContactIds = [];

        rows.forEach(row => {
            if (row.id !== primaryContactId) {
                if (row.email && !emails.includes(row.email)) emails.push(row.email);
                if (row.phoneNumber && !phoneNumbers.includes(row.phoneNumber)) phoneNumbers.push(row.phoneNumber);
                if (row.linkPrecedence === 'secondary') secondaryContactIds.push(row.id);
            }
        });


        const response = {
            contact: {
                primaryContactId,
                emails,
                phoneNumbers,
                secondaryContactIds,
            },
        };

        res.json(response);
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
