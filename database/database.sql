-- ============================================================================
-- SMART WASTE MANAGEMENT SYSTEM - DATABASE SCHEMA & SAMPLE DATA
-- DBMS B.Tech 2nd Year Computer Science Project
-- Database Engine: MySQL 8.0+ (InnoDB)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smart_waste_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_waste_management;

-- Disable Foreign Key checks for clean re-creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS collection_records;
DROP TABLE IF EXISTS schedule_bins;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS bins;
DROP TABLE IF EXISTS waste_categories;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS admins;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. LOCATIONS TABLE
-- Stores geographical collection areas, streets, and pincodes
-- ============================================================================
CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    area_name VARCHAR(100) NOT NULL,
    street VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 2. WASTE CATEGORIES TABLE
-- Stores standardized classification of segregated waste
-- ============================================================================
CREATE TABLE waste_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 3. BINS TABLE
-- Stores smart waste receptacles with capacities, fill levels, and status
-- ============================================================================
CREATE TABLE bins (
    bin_id INT AUTO_INCREMENT PRIMARY KEY,
    bin_code VARCHAR(50) NOT NULL UNIQUE,
    location_id INT NOT NULL,
    category_id INT NOT NULL,
    capacity_kg DECIMAL(8,2) NOT NULL,
    fill_level DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status ENUM('Active', 'Inactive', 'Maintenance') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bins_location FOREIGN KEY (location_id) 
        REFERENCES locations(location_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_bins_category FOREIGN KEY (category_id) 
        REFERENCES waste_categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_fill_level CHECK (fill_level >= 0.00 AND fill_level <= 100.00),
    CONSTRAINT chk_capacity CHECK (capacity_kg > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_bins_location ON bins(location_id);
CREATE INDEX idx_bins_category ON bins(category_id);
CREATE INDEX idx_bins_status ON bins(status);

-- ============================================================================
-- 4. TEAMS TABLE
-- Stores waste collection squads and field supervisors
-- ============================================================================
CREATE TABLE teams (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    team_leader VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    status ENUM('Active', 'Inactive', 'On Duty') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 5. TEAM MEMBERS TABLE
-- Stores individual crew members assigned to teams (1-to-Many relationship)
-- ============================================================================
CREATE TABLE team_members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    member_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Waste Collector',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_members_team FOREIGN KEY (team_id) 
        REFERENCES teams(team_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_members_team ON team_members(team_id);

-- ============================================================================
-- 6. SCHEDULES TABLE
-- Stores planned collection missions for locations and teams
-- ============================================================================
CREATE TABLE schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    collection_date DATE NOT NULL,
    start_time TIME NOT NULL,
    location_id INT NOT NULL,
    team_id INT NOT NULL,
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedules_location FOREIGN KEY (location_id) 
        REFERENCES locations(location_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_schedules_team FOREIGN KEY (team_id) 
        REFERENCES teams(team_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_schedules_date ON schedules(collection_date);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_team ON schedules(team_id);
CREATE INDEX idx_schedules_location ON schedules(location_id);

-- ============================================================================
-- 7. SCHEDULE BINS TABLE (Many-to-Many Bridge Table)
-- Associates specific bins with a scheduled collection run
-- ============================================================================
CREATE TABLE schedule_bins (
    schedule_bin_id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    bin_id INT NOT NULL,
    is_collected BOOLEAN NOT NULL DEFAULT FALSE,
    collected_at DATETIME NULL,
    CONSTRAINT fk_sb_schedule FOREIGN KEY (schedule_id) 
        REFERENCES schedules(schedule_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sb_bin FOREIGN KEY (bin_id) 
        REFERENCES bins(bin_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT unique_schedule_bin UNIQUE (schedule_id, bin_id)
) ENGINE=InnoDB;

CREATE INDEX idx_sb_schedule ON schedule_bins(schedule_id);
CREATE INDEX idx_sb_bin ON schedule_bins(bin_id);

-- ============================================================================
-- 8. COLLECTION RECORDS TABLE
-- Audit log of verified waste collections, weight measurements, and timestamps
-- ============================================================================
CREATE TABLE collection_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NULL,
    bin_id INT NOT NULL,
    team_id INT NOT NULL,
    collected_quantity_kg DECIMAL(8,2) NOT NULL,
    collection_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_records_schedule FOREIGN KEY (schedule_id) 
        REFERENCES schedules(schedule_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_records_bin FOREIGN KEY (bin_id) 
        REFERENCES bins(bin_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_records_team FOREIGN KEY (team_id) 
        REFERENCES teams(team_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_collected_quantity CHECK (collected_quantity_kg > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_records_datetime ON collection_records(collection_datetime);
CREATE INDEX idx_records_bin ON collection_records(bin_id);
CREATE INDEX idx_records_team ON collection_records(team_id);
CREATE INDEX idx_records_schedule ON collection_records(schedule_id);

-- ============================================================================
-- 9. ADMINS / USERS TABLE FOR AUTHENTICATION
-- Stores administrative personnel with role-based access credentials
-- ============================================================================
CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NULL,
    role ENUM('Super Admin', 'Municipal Officer', 'Dispatcher') NOT NULL DEFAULT 'Super Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- SAMPLE DATA INSERTIONS
-- ============================================================================

-- 1. Insert Default Waste Categories
INSERT INTO waste_categories (category_id, category_name, description) VALUES
(1, 'Organic Waste', 'Biodegradable kitchen food scraps, vegetable peels, and garden waste'),
(2, 'Plastic Waste', 'Recyclable polymers, HDPE bottles, LDPE wrappers, and containers'),
(3, 'Paper Waste', 'Clean cardboard, newspapers, magazines, office papers, and cartons'),
(4, 'Metal Waste', 'Aluminum cans, tin containers, scrap metal rods, and foil packaging'),
(5, 'Glass Waste', 'Glass jars, broken beverage bottles, and glassware containers'),
(6, 'General Waste', 'Non-recyclable inert domestic refuse, dust, and composite items');

-- 2. Insert Locations
INSERT INTO locations (location_id, area_name, street, city, pincode, description) VALUES
(1, 'Greenwood Campus', 'University North Avenue, Sector 4', 'Hyderabad', '500032', 'Main academic zone with department buildings and cafeteria'),
(2, 'Cyber Heights Tech Park', 'IT Expressway Road, Phase 2', 'Hyderabad', '500081', 'High-density commercial IT offices with corporate dining halls'),
(3, 'Sunrise Residential Colony', 'Lake View Boulevard, Block C', 'Hyderabad', '500049', 'Residential apartment society consisting of 450 residential flats'),
(4, 'Metro Central Station', 'Station Road Commercial Plaza', 'Hyderabad', '500001', 'High footfall public transit hub with commercial food stalls'),
(5, 'City General Hospital', 'Health City Complex, Sector 9', 'Hyderabad', '500072', 'Multi-specialty hospital perimeter and non-hazardous municipal collection'),
(6, 'Eco Market Yard', 'Wholesale Fruit & Veg Market Bypass', 'Hyderabad', '500035', 'Large commercial farmers and grocery market generating high organic mass');

-- 3. Insert Bins
INSERT INTO bins (bin_id, bin_code, location_id, category_id, capacity_kg, fill_level, status) VALUES
(1, 'BIN-ORG-101', 1, 1, 120.00, 85.50, 'Active'),
(2, 'BIN-PLS-102', 1, 2, 80.00, 42.00, 'Active'),
(3, 'BIN-PPR-103', 1, 3, 90.00, 78.00, 'Active'),
(4, 'BIN-GEN-104', 1, 6, 150.00, 92.00, 'Active'),
(5, 'BIN-ORG-201', 2, 1, 150.00, 64.00, 'Active'),
(6, 'BIN-PLS-202', 2, 2, 100.00, 88.00, 'Active'),
(7, 'BIN-MET-203', 2, 4, 75.00, 30.00, 'Active'),
(8, 'BIN-GLS-204', 2, 5, 60.00, 15.00, 'Active'),
(9, 'BIN-ORG-301', 3, 1, 200.00, 95.00, 'Active'),
(10, 'BIN-PLS-302', 3, 2, 100.00, 55.00, 'Active'),
(11, 'BIN-GEN-303', 3, 6, 180.00, 72.00, 'Active'),
(12, 'BIN-PPR-401', 4, 3, 100.00, 91.00, 'Active'),
(13, 'BIN-PLS-402', 4, 2, 120.00, 84.00, 'Active'),
(14, 'BIN-MET-403', 4, 4, 80.00, 22.00, 'Active'),
(15, 'BIN-ORG-601', 6, 1, 300.00, 96.00, 'Active'),
(16, 'BIN-GEN-501', 5, 6, 140.00, 10.00, 'Maintenance');

-- 4. Insert Teams
INSERT INTO teams (team_id, team_name, team_leader, contact_number, status) VALUES
(1, 'Green Eco Warriors', 'Ramesh Kumar', '+91 98765 43210', 'On Duty'),
(2, 'Clean City Patrol', 'Pooja Reddy', '+91 98480 12345', 'Active'),
(3, 'Metro Rapid Sanitation', 'Vikram Singh', '+91 97000 67890', 'On Duty'),
(4, 'Bio-Recycle Squad', 'Anil Sharma', '+91 99123 45678', 'Active');

-- 5. Insert Team Members
INSERT INTO team_members (member_id, team_id, member_name, phone_number, role) VALUES
(1, 1, 'Ramesh Kumar', '+91 98765 43210', 'Team Leader / Driver'),
(2, 1, 'Suresh Yadav', '+91 98765 43211', 'Senior Waste Collector'),
(3, 1, 'Kiran Patel', '+91 98765 43212', 'Equipment Specialist'),
(4, 2, 'Pooja Reddy', '+91 98480 12345', 'Team Leader'),
(5, 2, 'Mahesh Goud', '+91 98480 12346', 'Driver'),
(6, 2, 'Sunita Rao', '+91 98480 12347', 'Waste Handler'),
(7, 3, 'Vikram Singh', '+91 97000 67890', 'Team Leader / Safety Officer'),
(8, 3, 'Mohammed Arif', '+91 97000 67891', 'Compactor Operator'),
(9, 4, 'Anil Sharma', '+91 99123 45678', 'Team Leader'),
(10, 4, 'Santosh Naik', '+91 99123 45679', 'Segregation Assistant');

-- 6. Insert Collection Schedules
INSERT INTO schedules (schedule_id, collection_date, start_time, location_id, team_id, status) VALUES
(1, CURDATE(), '06:30:00', 1, 1, 'In Progress'),
(2, CURDATE(), '08:00:00', 6, 3, 'Pending'),
(3, CURDATE(), '10:00:00', 2, 2, 'Pending'),
(4, CURDATE(), '14:30:00', 4, 1, 'Pending'),
(5, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '06:00:00', 1, 1, 'Completed'),
(6, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:30:00', 3, 2, 'Completed'),
(7, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '07:00:00', 2, 3, 'Completed'),
(8, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '06:30:00', 6, 4, 'Completed');

-- 7. Insert Schedule Bins (Many-to-Many mapping)
INSERT INTO schedule_bins (schedule_bin_id, schedule_id, bin_id, is_collected, collected_at) VALUES
(1, 1, 1, TRUE, NOW()),
(2, 1, 2, FALSE, NULL),
(3, 1, 3, FALSE, NULL),
(4, 1, 4, FALSE, NULL),
(5, 2, 15, FALSE, NULL),
(6, 3, 5, FALSE, NULL),
(7, 3, 6, FALSE, NULL),
(8, 3, 7, FALSE, NULL),
(9, 4, 12, FALSE, NULL),
(10, 4, 13, FALSE, NULL),
(11, 5, 1, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(12, 5, 4, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(13, 6, 9, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(14, 6, 10, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(15, 6, 11, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(16, 7, 5, TRUE, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(17, 7, 6, TRUE, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(18, 8, 15, TRUE, DATE_SUB(NOW(), INTERVAL 3 DAY));

-- 8. Insert Realistic Collection Records
INSERT INTO collection_records (record_id, schedule_id, bin_id, team_id, collected_quantity_kg, collection_datetime, remarks) VALUES
(1, 8, 15, 4, 285.50, DATE_SUB(NOW(), INTERVAL 3 DAY), 'Eco Market bulk organic collection completed smoothly'),
(2, 7, 5, 3, 135.00, DATE_SUB(NOW(), INTERVAL 2 DAY), 'IT Park Cafeteria food waste collected on time'),
(3, 7, 6, 3, 92.50, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Beverage bottles and food packaging plastics collected'),
(4, 6, 9, 2, 190.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Morning residential compost clearance'),
(5, 6, 10, 2, 88.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Recyclable milk pouches and containers cleared'),
(6, 6, 11, 2, 165.20, DATE_SUB(NOW(), INTERVAL 1 DAY), 'General municipal waste cleared from Block C'),
(7, 5, 1, 1, 110.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Campus mess morning clearing'),
(8, 5, 4, 1, 142.50, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Hostel central bin general refuse emptied'),
(9, 1, 1, 1, 102.50, NOW(), 'Campus Organic bin emptied during active morning run'),
(10, NULL, 12, 3, 85.00, DATE_SUB(NOW(), INTERVAL 4 DAY), 'Manual on-demand clearance of metro newspaper overflow'),
(11, NULL, 3, 1, 78.50, DATE_SUB(NOW(), INTERVAL 5 DAY), 'Administrative exam wing paper recycling run'),
(12, NULL, 7, 2, 65.00, DATE_SUB(NOW(), INTERVAL 6 DAY), 'Tech park server room metal casing pickup'),
(13, NULL, 15, 4, 290.00, DATE_SUB(NOW(), INTERVAL 7 DAY), 'Weekend wholesale organic produce waste clearance'),
(14, NULL, 2, 1, 72.00, DATE_SUB(NOW(), INTERVAL 8 DAY), 'Weekly university plastic recovery collection'),
(15, NULL, 9, 2, 185.00, DATE_SUB(NOW(), INTERVAL 9 DAY), 'Colony Sunday community cleanup drive');

-- 9. Insert Admin Users (Login Credentials)
INSERT INTO admins (admin_id, username, password, full_name, email, phone_number, role) VALUES
(1, 'admin', 'admin123', 'Ashmitha (Administrator)', 'admin@smartwaste.gov.in', '9876543210', 'Super Admin'),
(2, 'officer', 'officer123', 'Rajesh Sharma', 'rajesh.sharma@smartwaste.gov.in', '9848011223', 'Municipal Officer'),
(3, 'dispatcher', 'dispatch123', 'Kiran Patel', 'kiran.patel@smartwaste.gov.in', '9700044556', 'Dispatcher');

COMMIT;

-- Verification Queries
SELECT 'locations' AS table_name, COUNT(*) AS row_count FROM locations
UNION ALL SELECT 'waste_categories', COUNT(*) FROM waste_categories
UNION ALL SELECT 'bins', COUNT(*) FROM bins
UNION ALL SELECT 'teams', COUNT(*) FROM teams
UNION ALL SELECT 'team_members', COUNT(*) FROM team_members
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL SELECT 'schedule_bins', COUNT(*) FROM schedule_bins
UNION ALL SELECT 'collection_records', COUNT(*) FROM collection_records
UNION ALL SELECT 'admins', COUNT(*) FROM admins;


