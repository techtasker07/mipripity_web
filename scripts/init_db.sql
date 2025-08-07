-- Drop tables if they exist to allow for clean re-creation
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS property_images CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS prospect_properties CASCADE;
DROP TABLE IF EXISTS vote_options CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    firebase_uid VARCHAR(255) UNIQUE,
    profile_picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Create Vote Options Table
CREATE TABLE vote_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Create Properties Table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    current_worth NUMERIC(15, 2),
    year_of_construction INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- Create Property Images Table
CREATE TABLE property_images (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create Votes Table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    vote_option_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, property_id), -- A user can only vote once per property
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (vote_option_id) REFERENCES vote_options(id) ON DELETE RESTRICT
);

-- Create Prospect Properties Table
CREATE TABLE prospect_properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL,
    estimated_worth NUMERIC(15, 2),
    year_of_construction INTEGER,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);
