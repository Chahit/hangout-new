#!/bin/bash

# Function to process each file
process_file() {
    local file=$1
    echo "Processing $file..."
    
    # Replace the import statement
    sed -i 's/import { createClientComponentClient } from '\''@supabase\/auth-helpers-nextjs'\''/import { createClient } from '\''@\/lib\/supabase\/client'\''/g' "$file"
    
    # Replace the client creation
    sed -i 's/const supabase = createClientComponentClient()/const supabase = createClient()/g' "$file"
    sed -i 's/const supabase = createClientComponentClient<Database>()/const supabase = createClient()/g' "$file"
}

# List of files to process
files=(
    "src/components/sidebar-nav.tsx"
    "src/components/UserSearch.tsx"
    "src/components/notifications.tsx"
    "src/app/onboarding/page.tsx"
    "src/app/dashboard/profile/page.tsx"
    "src/app/dashboard/settings/page.tsx"
    "src/app/dashboard/support/[id]/page.tsx"
    "src/app/dashboard/support/page.tsx"
    "src/app/dashboard/events/page.tsx"
    "src/app/dashboard/page.tsx"
    "src/app/dashboard/memes/page.tsx"
    "src/app/dashboard/layout.tsx"
    "src/app/dashboard/messages/page.tsx"
    "src/app/dashboard/messages/[username]/page.tsx"
    "src/app/dashboard/groups/page.tsx"
    "src/app/dashboard/groups/[id]/page.tsx"
    "src/app/dashboard/dating/matches/page.tsx"
    "src/app/dashboard/dating/page.tsx"
    "src/app/dashboard/confessions/page.tsx"
    "src/app/dashboard/dating/chat/[matchId]/page.tsx"
    "src/app/dashboard/dating/profile/page.tsx"
    "src/app/dashboard/components/ActivityTrends.tsx"
    "src/app/dashboard/dating/requests/page.tsx"
)

# Process each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        process_file "$file"
    else
        echo "Warning: File $file not found"
    fi
done

echo "Done updating files!" 