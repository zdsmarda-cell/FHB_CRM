CREATE DATABASE IF NOT EXISTS fhb_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'fhb_maintain'@'%' IDENTIFIED BY 'YourSecurePasswordHere';
GRANT ALL PRIVILEGES ON fhb_crm.* TO 'fhb_maintain'@'%';
FLUSH PRIVILEGES;

USE fhb_crm;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  role VARCHAR(50),
  managerId VARCHAR(50),
  isActive BOOLEAN,
  passwordHash TEXT,
  resetToken TEXT,
  resetTokenExpiry DATETIME,
  googleIntegration JSON,
  msIntegration JSON
);

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(50) PRIMARY KEY,
  companyId VARCHAR(50),
  name VARCHAR(100),
  address TEXT,
  country VARCHAR(100),
  region VARCHAR(50),
  segment VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(50),
  urls JSON,
  contacts JSON
);

CREATE TABLE IF NOT EXISTS deals (
  id VARCHAR(50) PRIMARY KEY,
  companyId VARCHAR(50),
  stage VARCHAR(50),
  postponedUntil DATETIME,
  postponeReason TEXT,
  postponedReason TEXT,
  postponedBy VARCHAR(50),
  postponedAt DATETIME,
  lostPermanently BOOLEAN,
  lostReason TEXT,
  lostReasonDetail TEXT,
  lostBy VARCHAR(50),
  lostAt DATETIME,
  estimatedValue DECIMAL(10,2),
  successProbability INT,
  createdBy VARCHAR(50),
  ownerId VARCHAR(50),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  dealId VARCHAR(50),
  companyId VARCHAR(50),
  field VARCHAR(50),
  oldValue TEXT,
  newValue TEXT,
  changedBy VARCHAR(50),
  timestamp DATETIME
);

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(50) PRIMARY KEY,
  dealId VARCHAR(50),
  type VARCHAR(50),
  date DATETIME,
  note TEXT,
  transcript TEXT,
  createdBy VARCHAR(50),
  meetingLink TEXT,
  createdAt DATETIME
);

INSERT IGNORE INTO users (id, name, email, role, isActive, passwordHash)
VALUES ('admin-1', 'Zdeněk Šmarda', 'zdenek.smarda@fhb.sk', 'administrator', true, 'cGFzc3dvcmQxMjNfc2VjcmV0X3NhbHQ=');
