# Setting Up Supabase Tables for Admin Panel Data

This guide will help you set up and configure Supabase tables to store your admin panel data.

## Prerequisites

- You already have a Supabase account and project
- Your Supabase URL and API Key are configured in both `.env` files

## Creating Tables in Supabase

1. Navigate to your Supabase project dashboard: https://app.supabase.com/ 
2. Go to the SQL Editor by clicking on "SQL Editor" in the left sidebar
3. Create a new query and paste the content from the `create_supabase_tables.sql` file
4. Click "Run" to execute the script and create the tables

## Verifying the Tables

1. After running the SQL, go to the "Table Editor" in the left sidebar
2. You should see two tables: `profiles` and `messages`
3. The `profiles` table should have one row with default values
4. The `messages` table will be empty initially

## Using the Admin Panel with Supabase

1. Launch the application
2. Navigate to `/admin` in your browser
3. The admin panel should load the profile data from Supabase
4. Make changes and save - the data will be stored in Supabase
5. You can verify the updates by checking the `profiles` table in Supabase

## Troubleshooting

If you encounter any issues:

1. Check that your Supabase URL and API keys are correct in both `.env` files
2. Verify that the tables were created correctly in Supabase
3. Check the browser console for any errors when loading or saving data

## Security Considerations

- The SQL script sets up Row Level Security (RLS) policies
- Anonymous users can read data, but only the service role can modify data
- You may need to adjust these policies based on your specific access requirements

## Additional Tables

If you need to store additional data in Supabase, follow these steps:

1. Define the table structure in SQL
2. Add the table to your SQL script
3. Update your backend code to interact with the new table
4. Update your frontend components to display and edit the data 