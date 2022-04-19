const models = require("../models")

class PalmaresMigrationsManager extends models.Manager {
    /**
     * Gets the migration that had runned before, this is the last one that was generated.
     * 
     * @returns {Promise<string>} - Retrieves the last migration name that was runned.
     */
    async getLastRunMigrationNameOrderedById() {
        const lastMigration = await this.instance.findOne({
            raw: true,
            attributes: ['migrationName'],
            order: [['id', 'DESC']]
        })

        if (lastMigration) {
            return lastMigration.migrationName
        } else {
            return ''
        }
    }

    async getMigrationsNumber() {
        return await this.instance.count()
    }
}

/**
 * A class for holding the migrations of the application.
 * 
 * This is appended and dependant on SequelizeEngine at the current time but we will soon change 
 * it's dependencies to work on and well with any Engine.
 */
class PalmaresMigrations extends models.Model {
    attributes = {
        createdAt: new models.fields.DatetimeField({autoNowAdd: true}),
        updatedAt: new models.fields.DatetimeField({autoNow: true}),
        app: new models.fields.CharField({maxLength: 280, allowNull: false}),
        migrationName: new models.fields.CharField({maxLength: 500., allowNull: false})
    }

    options = {
        tableName: 'palmares_migrations'
    }

    static migration = new PalmaresMigrationsManager()
}


module.exports = {
    PalmaresMigrations
}