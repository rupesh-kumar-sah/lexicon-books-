#!/usr/bin/env node

/**
 * Admin Credentials Setup Utility
 * Generates secure bcrypt hashed password for admin account
 * Usage: node admin-setup.mjs
 */

import bcrypt from 'bcryptjs';

async function generateAdminCredentials() {
  console.log('\n=== LEXICON BOOKS ADMIN SETUP ===\n');
  
  // Admin credentials from the requirements
  const email = 'sahkkr702@gmail.com';
  const password = 'rupesh@0123456';
  const pin = '2063';
  
  try {
    // Generate bcrypt hash with 10 salt rounds
    const hash = await bcrypt.hash(password, 10);
    
    console.log('✓ Admin Credentials Generated\n');
    console.log('Admin Email:', email);
    console.log('Admin PIN:  ', pin);
    console.log('\nAdd these to your .env file:\n');
    console.log(`ADMIN_EMAIL=${email}`);
    console.log(`ADMIN_PIN=${pin}`);
    console.log(`ADMIN_HASHED_PASSWORD=${hash}`);
    console.log('\n=== SECURITY NOTES ===\n');
    console.log('1. Keep the .env file secure and never commit it to version control');
    console.log('2. Change the password after first login');
    console.log('3. Admin panel is only accessible at: /admin-dashboard-secret-2063');
    console.log('4. All admin access attempts are logged for security auditing');
    console.log('5. This utility should only be run during initial setup\n');
    
  } catch (error) {
    console.error('Error generating credentials:', error);
    process.exit(1);
  }
}

generateAdminCredentials();
