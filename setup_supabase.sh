#!/bin/bash

# Setup Supabase Tables Script
# This script helps set up the required tables in Supabase for the admin panel data

echo "===== Setting Up Supabase Tables ====="

# Instructions
echo ""
echo "To set up your Supabase tables:"
echo ""
echo "1. Login to your Supabase dashboard at https://app.supabase.com/"
echo "2. Select your project: byddvbuzcgegasqeyuuc"
echo "3. Go to the SQL Editor (left sidebar)"
echo "4. Create a new query and paste the contents of create_supabase_tables.sql"
echo "5. Click 'Run' to execute the SQL and create the tables"
echo ""
echo "===== Verifying Supabase Connection ====="
echo ""
echo "Running test script to verify Supabase connection..."
echo ""

# Run the test script
python test_supabase.py

echo ""
echo "===== Next Steps ====="
echo ""
echo "If there were any errors in the test, please:"
echo "1. Check that you've run the SQL script in Supabase"
echo "2. Verify your Supabase URL and API Key are correct in backend/.env"
echo "3. Run this script again to verify the connection"
echo ""
echo "If all tests pass, your Supabase tables are set up correctly!"
echo "You can now use the admin panel to manage your profile data."
echo "" 