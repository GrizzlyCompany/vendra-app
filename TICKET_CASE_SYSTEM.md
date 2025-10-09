# Ticket/Case System Implementation

## Overview
This document describes the implementation of the ticket/case system for the messaging functionality in the Vendra application. The system ensures that when an admin closes a support case, the user cannot continue chatting about that specific issue and must create a new report if they have another concern.

## Components

### 1. Database Level Protection
- **Trigger Function**: `check_conversation_status()` prevents insertion of new messages into closed conversations
- **Trigger**: `prevent_messages_to_closed_conversations` executes before each message insert
- **Logic**: Checks if there are any closed messages in the conversation between user and admin

### 2. Admin Functionality
- **Close Case**: `admin-close-case` function updates all messages in a conversation to `case_status: 'closed'`
- **Reopen Case**: `admin-reopen-case` function updates all messages in a conversation to `case_status: 'open'`
- **UI**: Admin MessagesTable shows case status and provides options to close or reopen cases

### 3. User Interface
- **Closed Conversation Display**: Shows a message explaining the case is closed with a button to create a new report
- **Message Sending Prevention**: Client-side and server-side checks prevent sending messages to closed conversations
- **New Report Creation**: Button opens the reports page in a new tab for users to create a new support ticket

### 4. User Experience
- When a user tries to send a message in a closed conversation:
  1. Client-side check displays an alert
  2. Server-side database trigger prevents the message from being saved
- When a user clicks "Create New Report":
  1. Opens the `/reports` page in a new tab
  2. User can submit a new support ticket

## Workflow

### Closing a Case (Admin)
1. Admin opens a conversation in the admin panel
2. Admin clicks "Cerrar Caso" from the dropdown menu
3. Confirmation dialog appears
4. Upon confirmation:
   - All messages in the conversation are updated to `case_status: 'closed'`
   - Success message is displayed
   - Conversation list is refreshed

### Reopening a Case (Admin)
1. Admin opens a closed conversation in the admin panel
2. Admin clicks "Reabrir Caso" from the dropdown menu
3. Confirmation dialog appears
4. Upon confirmation:
   - All messages in the conversation are updated to `case_status: 'open'`
   - Success message is displayed
   - Conversation list is refreshed

### User Interaction with Closed Case
1. User navigates to the messages page
2. User opens a conversation with a closed case
3. Input area shows a "closed conversation" message instead of the text input
4. User clicks "Crear Nuevo Reporte" button
5. New tab opens with the reports page

## Technical Implementation Details

### Database Schema
The `messages` table includes:
- `case_status`: String field indicating the status of the case ('open', 'closed', 'resolved')
- `closed_at`: Timestamp when the case was closed
- `closed_by`: User ID of the admin who closed the case
- `conversation_type`: String field indicating the type of conversation ('user_to_admin', 'user_to_user')

### Supabase Functions
1. `admin-close-case`: Updates messages to closed status
2. `admin-reopen-case`: Updates messages to open status
3. `check-conversation-status`: Checks if a conversation is closed (used by client)

### Frontend Components
1. `ConversationDetail`: Shows conversation details in admin panel
2. `MessagesTable`: Lists all conversations in admin panel
3. `ChatView`: Shows chat interface for users
4. `MessagesPage`: Main messages page for users

## Security Considerations
- Only authenticated admin users can close/reopen cases
- Database triggers prevent unauthorized message insertion
- All functions validate user permissions before execution

## Future Improvements
- Add notification system to inform users when their case is closed
- Implement case resolution reasons
- Add case priority levels
- Create case assignment functionality for multiple admins