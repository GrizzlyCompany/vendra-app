# Ticket/Case Management System

## Overview
This document explains how the ticket/case management system works in the Vendra application, specifically for the admin messaging functionality.

## How It Works

### For Administrators (/admin/messages)
1. **View Conversations**: Admins can see all user support conversations in the messages table
2. **Case Status**: Each conversation shows its current status (Abierto/Cerrado)
3. **Close Case**: Admins can close a case using the "Cerrar Caso" option in the dropdown menu
4. **Reopen Case**: Admins can reopen a closed case using the "Reabrir Caso" option in the dropdown menu

### For Users (/messages)
1. **Chat Normally**: Users can chat with admins as usual when cases are open
2. **Closed Case Notification**: When an admin closes a case, users see a notification in the chat
3. **Prevented Messaging**: Users cannot send new messages in closed conversations
4. **New Report**: Users can create a new report by clicking the "Crear Nuevo Reporte" button

## Technical Implementation

### Database Structure
The system uses the existing `messages` table with these additional fields:
- `conversation_type`: Distinguishes between user-to-user and user-to-admin conversations
- `case_status`: Tracks if a case is 'open', 'closed', or 'resolved'
- `closed_at`: Timestamp when a case was closed
- `closed_by`: Admin user ID who closed the case

### Supabase Functions
1. `admin-close-case`: Updates all messages in a conversation to closed status
2. `admin-reopen-case`: Updates all messages in a conversation to open status
3. `check-conversation-status`: Checks if a conversation is closed (used by client)

### Database Protection
A trigger function prevents insertion of new messages into closed conversations at the database level.

## Deployment Notes

### Database Migration
Run the migration file `supabase/migrations/001_prevent_messages_to_closed_conversations.sql` to set up the database trigger.

### Supabase Functions
Deploy the new functions:
1. `supabase/functions/check-conversation-status`
2. `supabase/functions/admin-reopen-case`

Update the existing function:
1. `supabase/functions/admin-close-case`

## User Experience

### When an Admin Closes a Case
- The user immediately sees a notification in their chat
- The user cannot send new messages in that conversation
- The user can click "Crear Nuevo Reporte" to open the reports page

### When an Admin Reopens a Case
- The conversation becomes available for messaging again
- Both user and admin can continue the conversation
- The case status updates to "Abierto" in the admin panel

## Security
- Only authenticated admin users can close/reopen cases
- Database triggers prevent unauthorized message insertion
- All functions validate user permissions before execution