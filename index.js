const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();
app.use(express.json());

const db = new sqlite3.Database("mydb.sqlite", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});


function createContactsTable() {
  const checkTableQuery = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='Contacts';
    `;

  db.get(checkTableQuery, (err, row) => {
    if (err) {
      console.error("Error checking for Contacts table:", err.message);
    } else if (row) {
      console.log("Contacts table already exists.");
    } else {
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
          console.error("Error creating Contacts table:", err.message);
        } else {
          console.log("Contacts table created successfully.");
        }
      });
    }
  });
}

createContactsTable()
app.post("/identity", (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ error: "At least one of email or phoneNumber is required" });
  }

  try {
    const findQuery = `
            SELECT * FROM Contacts 
            WHERE (email = ? OR phoneNumber = ?) AND deletedAt IS NULL
        `;
    db.all(findQuery, [email, phoneNumber], (err, rows) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (rows.length === 0) {
        const createdAt = new Date().toISOString();
        const insertQuery = `
                    INSERT INTO Contacts (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
                    VALUES (?, ?, ?, 'primary', ?, ?)
                `;
        db.run(
          insertQuery,
          [email, phoneNumber, null, createdAt, createdAt],
          function (err) {
            if (err) {
              console.error("Insert error:", err.message);
              return res.status(500).json({ error: "Internal server error" });
            }

            return res.status(201).json({
              contact: {
                primaryContactId: this.lastID,
                emails: [email],
                phoneNumbers: [phoneNumber],
                secondaryContactIds: [],
              },
            });
          }
        );
      } else {
        const primaryContacts = rows.filter(
          (row) => row.linkPrecedence === "primary"
        );
        const secondaryContacts = rows.filter(
          (row) => row.linkPrecedence === "secondary"
        );

        if (primaryContacts.length > 1) {
          const [truePrimary, ...otherPrimaries] = primaryContacts.sort(
            (a, b) => a.createdAt.localeCompare(b.createdAt)
          );

          const updateSecondaryQuery = `
                        UPDATE Contacts 
                        SET linkPrecedence = 'secondary', linkedId = ?
                        WHERE id = ?
                    `;

          otherPrimaries.forEach((primary) => {
            db.run(
              updateSecondaryQuery,
              [truePrimary.id, primary.id],
              (err) => {
                if (err) {
                  console.error("Update error:", err.message);
                  return res
                    .status(500)
                    .json({ error: "Internal server error" });
                }
              }
            );
          });

          const emails = [
            ...new Set([...rows.map((r) => r.email).filter(Boolean)]),
          ];
          const phoneNumbers = [
            ...new Set([...rows.map((r) => r.phoneNumber).filter(Boolean)]),
          ];
          const secondaryContactIds = [
            ...new Set([
              ...secondaryContacts.map((r) => r.id),
              ...otherPrimaries.map((r) => r.id),
            ]),
          ];

          return res.status(200).json({
            contact: {
              primaryContactId: truePrimary.id,
              emails,
              phoneNumbers,
              secondaryContactIds,
            },
          });
        } else {
          const primaryContact = primaryContacts[0];
          const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
          const phoneNumbers = [
            ...new Set(rows.map((r) => r.phoneNumber).filter(Boolean)),
          ];
          const secondaryContactIds = secondaryContacts.map((r) => r.id);

          if (!emails.includes(email) || !phoneNumbers.includes(phoneNumber)) {
            const createdAt = new Date().toISOString();
            const insertQuery = `
                            INSERT INTO Contacts (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
                            VALUES (?, ?, ?, 'secondary', ?, ?)
                        `;
            db.run(
              insertQuery,
              [email, phoneNumber, primaryContact, createdAt, createdAt],
              function (err) {
                if (err) {
                  console.error("Insert error:", err.message);
                  return res
                    .status(500)
                    .json({ error: "Internal server error" });
                }

                secondaryContactIds.push(this.lastID);
                return res.status(201).json({
                  contact: {
                    primaryContactId: primaryContact,
                    emails,
                    phoneNumbers,
                    secondaryContactIds,
                  },
                });
              }
            );
          } else {
            return res.status(200).json({
              contact: {
                primaryContactId: primaryContact.id,
                emails,
                phoneNumbers,
                secondaryContactIds,
              },
            });
          }
        }
      }
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
