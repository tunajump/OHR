-- Create Users table
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('business', 'provider', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Businesses table
CREATE TABLE Businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Create BusinessLocations table
CREATE TABLE BusinessLocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    employee_count ENUM('1-10', '11-50', '51-100', '> 100') NOT NULL,
    FOREIGN KEY (business_id) REFERENCES Businesses(id)
);

-- Create OHProviders table
CREATE TABLE OHProviders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_expiry DATE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Create OHProviderLocations table
CREATE TABLE OHProviderLocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    coverage_radius ENUM(10, 30, 50, 100, 500) NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES OHProviders(id)
);

-- Create OHProviderServices table
CREATE TABLE OHProviderServices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    service_type ENUM('Management Referrals', 'Health Surveillance', 'Preplacements') NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES OHProviders(id)
);

-- Create Referrals table
CREATE TABLE Referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    business_location_id INT NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    employee_count INT NOT NULL DEFAULT 1,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notes TEXT,
    status ENUM('pending', 'matched', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES Businesses(id),
    FOREIGN KEY (business_location_id) REFERENCES BusinessLocations(id)
);

-- Create ReferralMatches table
CREATE TABLE ReferralMatches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referral_id INT NOT NULL,
    provider_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_id) REFERENCES Referrals(id),
    FOREIGN KEY (provider_id) REFERENCES OHProviders(id)
);

-- Create UserPasskeys table for WebAuthn FIDO2 Biometric Login
CREATE TABLE IF NOT EXISTS UserPasskeys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    credential_id VARCHAR(500) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports VARCHAR(255),
    device_name VARCHAR(255) DEFAULT 'Security Key / Biometrics',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);