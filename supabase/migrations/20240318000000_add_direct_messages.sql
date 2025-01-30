-- Create direct messages table
create table if not exists direct_messages (
    id uuid default gen_random_uuid() primary key,
    content text not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    receiver_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint sender_receiver_different check (sender_id != receiver_id)
);

-- Add RLS policies
alter table direct_messages enable row level security;

-- Policy to allow users to insert their own messages
create policy "Users can insert their own messages"
    on direct_messages for insert
    with check (auth.uid() = sender_id);

-- Policy to allow users to read messages they're involved in
create policy "Users can read messages they're involved in"
    on direct_messages for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Create index for better query performance
create index direct_messages_sender_receiver_idx
    on direct_messages(sender_id, receiver_id);

-- Create index for timestamp-based queries
create index direct_messages_created_at_idx
    on direct_messages(created_at desc); 