# Future Implementation Roadmap

This document outlines the planned extensions for Vendra's specialized roles and features.

## 1. Business Plan (Empresas) Features

### 1.1 Corporate Dashboard (Analytics)
**Goal:** Provide business owners with insights into their team's performance.
*   **Metrics to Track:**
    *   Total Views per Agent/Property.
    *   Lead Conversion Rates (Messages received vs. Views).
    *   Top Performing Agents ranking.
*   **Visuals:** Graphs showing view trends over time (Last 30 days).

### 1.2 CRM Integration API
**Goal:** Allow large real estate firms to connect Vendra with their existing CRM (Salesforce, HubSpot, etc.).
*   **Features:**
    *   **Lead Webhooks:** Automatically post new message details (Name, Phone, Inquiry) to an external webhook URL provided by the company.
    *   **Inventory Sync:** (Advanced Phase) Allow uploading/updating properties via a standard JSON/XML feed or REST API to avoid manual double-entry.

### 1.3 Custom Branding (White-Labeling)
**Goal:** Strengthen the corporate identity of the team.
*   **Features:**
    *   **Company Logo:** Display the company logo on all team member profiles and property cards.
    *   **Brand Colors:** Allow setting a primary hex color for the company's profile page header.
    *   **Custom Subdomain:** (Optional) `company.vendra.com`.

### 1.4 Advanced Role Management
**Goal:** More granular control for larger teams.
*   **New Roles:**
    *   **Manager:** Can edit other agents' listings and invite members, but cannot delete the team or change billing.
    *   **Finance:** Can only view billing/subscription invoices.

---

## 2. Agent Pro Features

### 2.1 Advanced Market Analytics
**Goal:** Provide Pro Agents with competitive insights to help them price properties better.
*   **Feature:** **"Market Comp" (Comparative Market Analysis)**
*   **Functionality:**
    *   Calculate the **Average Price per m²** for specific neighborhoods/cities.
    *   **Visualization:** A chart comparing the *Agent's Property Price* vs. the *Market Average* for similar properties (e.g., "Your 2-bed flat in Palermo is 10% above market averge").
    *   **Benefit:** Helps agents justify prices to their clients or adjust strategies.
