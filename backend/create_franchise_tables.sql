-- Franchise tablolarını oluştur
CREATE TABLE IF NOT EXISTS franchises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    ownerName VARCHAR(255) NOT NULL,
    ownerEmail VARCHAR(255) NOT NULL,
    ownerPhone VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    agreementDate TIMESTAMP NOT NULL,
    expiryDate TIMESTAMP,
    monthlyRoyalty DECIMAL(10,2) DEFAULT 0,
    performanceScore DECIMAL(5,2) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS franchise_support_tickets (
    id SERIAL PRIMARY KEY,
    franchiseId INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    assignedTo VARCHAR(255),
    resolution TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (franchiseId) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS franchise_performance_reports (
    id SERIAL PRIMARY KEY,
    franchiseId INTEGER NOT NULL,
    reportDate TIMESTAMP NOT NULL,
    monthlyRevenue DECIMAL(12,2) NOT NULL,
    orderCount INTEGER NOT NULL,
    customerCount INTEGER NOT NULL,
    averageOrderValue DECIMAL(10,2) NOT NULL,
    customerSatisfaction DECIMAL(5,2) NOT NULL,
    complianceScore DECIMAL(5,2) NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (franchiseId) REFERENCES franchises(id) ON DELETE CASCADE
);

-- Branch tablosuna franchise ilişkisi ekle (eğer branches tablosu varsa)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'branches') THEN
        ALTER TABLE branches ADD COLUMN IF NOT EXISTS franchiseId INTEGER;
        -- Constraint eklemeyi dene
        BEGIN
            ALTER TABLE branches ADD CONSTRAINT fk_branch_franchise 
                FOREIGN KEY (franchiseId) REFERENCES franchises(id);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Constraint zaten varsa hata verme
                NULL;
        END;
    END IF;
END $$; 