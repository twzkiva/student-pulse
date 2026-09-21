ALTER TABLE users
ADD COLUMN password_algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256-hmacpepper-v1';
