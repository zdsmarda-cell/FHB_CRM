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
  phonePrefix VARCHAR(20),
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
  hunterId VARCHAR(50),
  closerId VARCHAR(50),
  farmerId VARCHAR(50),
  leadSourceId VARCHAR(50),
  ecommercePlatformId VARCHAR(50),
  estimatedMonthlyParcels INT,
  deliveryCountries JSON,
  averageItemsPerOrder DECIMAL(10,2),
  averageParcelWeight DECIMAL(10,2),
  averageParcelVolume INT,
  pricingOffers JSON,
  contractSignedDate DATETIME,
  pricingUploadedDate DATETIME,
  itIntegrationId VARCHAR(50),
  firstStockingDate DATETIME,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS lead_sources (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ecommerce_platforms (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS it_integrations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE
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

CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR(50) PRIMARY KEY,
  recipient VARCHAR(100),
  subject VARCHAR(255),
  status VARCHAR(50),
  error TEXT,
  sentAt DATETIME
);

INSERT IGNORE INTO users (id, name, email, role, isActive, passwordHash)
VALUES ('admin-1', 'Zdeněk Šmarda', 'zdenek.smarda@fhb.sk', 'administrator', true, 'cGFzc3dvcmQxMjNfc2VjcmV0X3NhbHQ=');
