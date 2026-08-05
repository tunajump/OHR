const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

let User;

if (process.env.DB_HOST === 'force_mock_db') {
  // Mock model for in-memory database fallback (e.g. during integration testing)
  class MockUser {
    constructor(properties) {
      Object.assign(this, properties);
    }

    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    }
  }

  const MockUserModel = {
    async findOne({ where }) {
      const pool = require('../utils/db');
      const email = where.email;
      const userObj = pool.memoryDb.Users.find(u => u.email === email);
      if (!userObj) return null;

      const userTypeVal = userObj.userType || userObj.user_type;
      return new MockUser({
        id: userObj.id,
        email: userObj.email,
        password: userObj.password,
        userType: userTypeVal,
        user_type: userTypeVal,
        name: userObj.name || '',
        organizationName: userObj.organizationName || ''
      });
    },

    async create(attributes) {
      const pool = require('../utils/db');
      const { email, password, userType, name, organizationName } = attributes;

      // Automatically execute password hashing hook (beforeCreate)
      const hashedPassword = await bcrypt.hash(password, 12);

      const id = pool.nextIds.Users++;
      const userTypeVal = userType;
      const newUser = {
        id,
        email,
        password: hashedPassword,
        user_type: userTypeVal,
        userType: userTypeVal,
        name: name || '',
        organizationName: organizationName || '',
        created_at: new Date()
      };

      pool.memoryDb.Users.push(newUser);

      return new MockUser(newUser);
    }
  };

  User = MockUserModel;
} else {
  // Real Sequelize model
  User = sequelize.define('User', {
    name: {
      type: DataTypes.VIRTUAL,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userType: {
      type: DataTypes.ENUM('provider', 'business'),
      allowNull: false,
      field: 'user_type'
    },
    organizationName: {
      type: DataTypes.VIRTUAL,
      allowNull: true
    }
  }, {
    tableName: 'Users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });

  User.prototype.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  Object.defineProperty(User.prototype, 'user_type', {
    get() {
      return this.userType;
    },
    configurable: true
  });
}

module.exports = User;
