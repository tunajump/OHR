const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

// Mock model definition
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

// Real Sequelize User model
let RealSequelizeUser = null;
try {
  RealSequelizeUser = sequelize.define('User', {
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
      type: DataTypes.ENUM('provider', 'business', 'admin'),
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

  RealSequelizeUser.prototype.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };
} catch (err) {
  console.warn('Sequelize define warning:', err.message);
}

// Resilient Unified User Interface
const User = {
  async findOne(options) {
    const pool = require('../utils/db');
    if (pool.useMock || !RealSequelizeUser) {
      return MockUserModel.findOne(options);
    }
    try {
      return await RealSequelizeUser.findOne(options);
    } catch (e) {
      console.warn('Sequelize findOne failed, falling back to mock DB:', e.message);
      pool.useMock = true;
      return MockUserModel.findOne(options);
    }
  },

  async create(attributes) {
    const pool = require('../utils/db');
    if (pool.useMock || !RealSequelizeUser) {
      return MockUserModel.create(attributes);
    }
    try {
      return await RealSequelizeUser.create(attributes);
    } catch (e) {
      console.warn('Sequelize create failed, falling back to mock DB:', e.message);
      pool.useMock = true;
      return MockUserModel.create(attributes);
    }
  }
};

module.exports = User;
