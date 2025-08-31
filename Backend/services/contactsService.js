const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class ContactsService {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/contacts.db');
    this.db = null;
    this.initializeDatabase();
  }

  /**
   * Initialize SQLite database for contacts
   */
  async initializeDatabase() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Create contacts table if it doesn't exist
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          walletAddress TEXT NOT NULL,
          category TEXT DEFAULT 'friend',
          phoneNumber TEXT,
          email TEXT,
          notes TEXT,
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(userId, name),
          UNIQUE(userId, walletAddress)
        )
      `);

      // Create index for better search performance
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_contacts_userId ON contacts(userId);
        CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
        CREATE INDEX IF NOT EXISTS idx_contacts_address ON contacts(walletAddress);
      `);

      console.log('✅ Contacts database initialized successfully');

      // Seed with some default contacts if database is empty
      await this.seedDefaultContacts();

    } catch (error) {
      console.error('❌ Error initializing contacts database:', error);
    }
  }

  /**
   * Seed database with default contacts for testing
   */
  async seedDefaultContacts() {
    try {
      const count = await this.db.get('SELECT COUNT(*) as count FROM contacts');
      
      if (count.count === 0) {
        console.log('📝 Seeding default contacts...');
        
        const defaultContacts = [
          {
            userId: 'test-user',
            name: 'Alice',
            walletAddress: '0x742DC4d0b5e8A8C3BBe8FB5C8F8E1C3D2A1F9E8B',
            category: 'friend',
            phoneNumber: '+1-555-0101',
            email: 'alice@example.com'
          },
          {
            userId: 'test-user',
            name: 'Bob',
            walletAddress: '0x8E7F5A2C4B6D9E1F3A8C5B2E7D4A9C6F1B8E5D2A',
            category: 'friend',
            phoneNumber: '+1-555-0102',
            email: 'bob@example.com'
          },
          {
            userId: 'test-user',
            name: 'Treasury',
            walletAddress: '0xA1B2C3D4E5F6789012345678901234567890ABCD',
            category: 'business',
            notes: 'Company treasury wallet'
          }
        ];

        for (const contact of defaultContacts) {
          await this.addContact(contact);
        }

        console.log('✅ Default contacts seeded successfully');
      }
    } catch (error) {
      console.error('❌ Error seeding default contacts:', error);
    }
  }

  /**
   * Add a new contact
   * @param {Object} contactData - Contact information
   * @returns {Object} Operation result
   */
  async addContact(contactData) {
    try {
      const {
        userId,
        name,
        walletAddress,
        category = 'friend',
        phoneNumber = null,
        email = null,
        notes = null
      } = contactData;

      // Validate required fields
      if (!userId || !name || !walletAddress) {
        return {
          success: false,
          error: 'Missing required fields: userId, name, walletAddress'
        };
      }

        // Validate wallet address format (basic check)
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return {
          success: false,
          error: 'Invalid wallet address format'
        };
      }

      const result = await this.db.run(`
        INSERT INTO contacts (userId, name, walletAddress, category, phoneNumber, email, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, name, walletAddress, category, phoneNumber, email, notes]);

      return {
        success: true,
        contactId: result.lastID,
        message: `Contact "${name}" added successfully`
      };

    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return {
          success: false,
          error: 'Contact with this name or address already exists'
        };
      }
      console.error('❌ Error adding contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find a contact by name or partial name
   * @param {string} query - Search query (name or partial name)
   * @param {string} userId - User ID
   * @returns {Object} Search result
   */
  async findContact(query, userId) {
    try {
      // First try exact name match
      let contact = await this.db.get(`
        SELECT * FROM contacts 
        WHERE userId = ? AND name = ? AND isActive = 1
      `, [userId, query]);

      if (contact) {
        return {
          success: true,
          contact: contact,
          matchType: 'exact'
        };
      }

      // Try case-insensitive match
      contact = await this.db.get(`
        SELECT * FROM contacts 
        WHERE userId = ? AND LOWER(name) = LOWER(?) AND isActive = 1
      `, [userId, query]);

      if (contact) {
        return {
          success: true,
          contact: contact,
          matchType: 'case_insensitive'
        };
      }

      // Try partial match
      contact = await this.db.get(`
        SELECT * FROM contacts 
        WHERE userId = ? AND name LIKE ? AND isActive = 1
        ORDER BY name
      `, [userId, `%${query}%`]);

      if (contact) {
        return {
          success: true,
          contact: contact,
          matchType: 'partial'
        };
      }

      return {
        success: false,
        reason: 'contact_not_found',
        query: query
      };

    } catch (error) {
      console.error('❌ Error finding contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for similar contacts (fuzzy search)
   * @param {string} query - Search query
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results to return
   * @returns {Array} Array of similar contacts
   */
  async searchSimilarContacts(query, userId, limit = 5) {
    try {
      const contacts = await this.db.all(`
        SELECT *, 
               CASE 
                 WHEN LOWER(name) = LOWER(?) THEN 100
                 WHEN LOWER(name) LIKE LOWER(?) THEN 80
                 WHEN LOWER(name) LIKE LOWER(?) THEN 60
                 ELSE 0
               END as similarity
        FROM contacts 
        WHERE userId = ? AND isActive = 1 AND similarity > 0
        ORDER BY similarity DESC, name
        LIMIT ?
      `, [query, `${query}%`, `%${query}%`, userId, limit]);

      return contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        walletAddress: contact.walletAddress,
        category: contact.category,
        similarity: contact.similarity
      }));

    } catch (error) {
      console.error('❌ Error searching similar contacts:', error);
      return [];
    }
  }

  /**
   * Get all contacts for a user
   * @param {string} userId - User ID
   * @param {string} category - Filter by category (optional)
   * @returns {Array} Array of contacts
   */
  async getUserContacts(userId, category = null) {
    try {
      let query = `
        SELECT * FROM contacts 
        WHERE userId = ? AND isActive = 1
      `;
      const params = [userId];

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      query += ` ORDER BY name`;

      const contacts = await this.db.all(query, params);
      return contacts;

    } catch (error) {
      console.error('❌ Error getting user contacts:', error);
      return [];
    }
  }

  /**
   * Update a contact
   * @param {number} contactId - Contact ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID (for security)
   * @returns {Object} Operation result
   */
  async updateContact(contactId, updateData, userId) {
    try {
      const allowedFields = ['name', 'walletAddress', 'category', 'phoneNumber', 'email', 'notes'];
      const updates = [];
      const values = [];

      // Build dynamic update query
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: 'No valid fields to update'
        };
      }

      // Add updatedAt timestamp
      updates.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(contactId, userId);

      const result = await this.db.run(`
        UPDATE contacts 
        SET ${updates.join(', ')}
        WHERE id = ? AND userId = ? AND isActive = 1
      `, values);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'Contact not found or permission denied'
        };
      }

      return {
        success: true,
        message: 'Contact updated successfully'
      };

    } catch (error) {
      console.error('❌ Error updating contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a contact (soft delete)
   * @param {number} contactId - Contact ID
   * @param {string} userId - User ID (for security)
   * @returns {Object} Operation result
   */
  async deleteContact(contactId, userId) {
    try {
      const result = await this.db.run(`
        UPDATE contacts 
        SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ? AND isActive = 1
      `, [contactId, userId]);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'Contact not found or permission denied'
        };
      }

      return {
        success: true,
        message: 'Contact deleted successfully'
      };

    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get contact statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Contact statistics
   */
  async getContactStats(userId) {
    try {
      const stats = await this.db.all(`
        SELECT 
          category,
          COUNT(*) as count
        FROM contacts 
        WHERE userId = ? AND isActive = 1
        GROUP BY category
        ORDER BY count DESC
      `, [userId]);

      const total = await this.db.get(`
        SELECT COUNT(*) as total 
        FROM contacts 
        WHERE userId = ? AND isActive = 1
      `, [userId]);

      return {
        total: total.total,
        byCategory: stats,
        categories: stats.map(s => s.category)
      };

    } catch (error) {
      console.error('❌ Error getting contact stats:', error);
      return {
        total: 0,
        byCategory: [],
        categories: []
      };
    }
  }

  /**
   * Import contacts from JSON
   * @param {string} userId - User ID
   * @param {Array} contacts - Array of contact objects
   * @returns {Object} Import result
   */
  async importContacts(userId, contacts) {
    try {
      let imported = 0;
      let errors = [];

      for (const contact of contacts) {
        const result = await this.addContact({
          userId,
          ...contact
        });

        if (result.success) {
          imported++;
        } else {
          errors.push({
            contact: contact.name,
            error: result.error
          });
        }
      }

      return {
        success: true,
        imported: imported,
        total: contacts.length,
        errors: errors
      };

    } catch (error) {
      console.error('❌ Error importing contacts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export contacts to JSON
   * @param {string} userId - User ID
   * @returns {Array} Array of contacts
   */
  async exportContacts(userId) {
    try {
      const contacts = await this.db.all(`
        SELECT name, walletAddress, category, phoneNumber, email, notes, createdAt
        FROM contacts 
        WHERE userId = ? AND isActive = 1
        ORDER BY name
      `, [userId]);

      return contacts;

    } catch (error) {
      console.error('❌ Error exporting contacts:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = ContactsService;
