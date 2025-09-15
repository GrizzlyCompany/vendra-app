# Vendra App - Real Estate Platform

A modern real estate platform built with Next.js, TypeScript, and Supabase. Vendra allows users to list, search, and manage properties with a focus on mobile-first design and user experience.

## Features

- 🏠 **Property Management**: Create, edit, and manage property listings
- 🔍 **Advanced Search**: Filter properties by location, price, type, and more
- 👤 **User Profiles**: Manage user accounts and seller profiles
- 📱 **Mobile-First Design**: Optimized for mobile devices with responsive design
- 💬 **Messaging System**: Built-in communication between buyers and sellers
- 📊 **Dashboard**: Comprehensive dashboard for property owners
- 🔐 **Authentication**: Secure user authentication with Supabase

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **UI Components**: Custom components with Radix UI primitives
- **Icons**: Lucide React
- **State Management**: React hooks and context

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/vendra-app.git
cd vendra-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Run the SQL commands from `supabase/schema.sql` in the SQL editor

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── dashboard/       # User dashboard
│   ├── properties/      # Property listings and details
│   ├── profile/         # User profiles
│   └── ...
├── components/          # Reusable React components
│   ├── ui/              # Base UI components
│   └── ...
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and configurations
└── types/               # TypeScript type definitions
```

## Key Features Implementation

- **Mobile-First Design**: Responsive components with mobile-optimized navigation
- **Property Cards**: Interactive property listings with image galleries
- **User Authentication**: Secure login/signup with Supabase Auth
- **Dashboard**: Property management and statistics
- **Search & Filters**: Advanced property search functionality
- **Profile Management**: User and seller profile pages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help setting up the project, please open an issue in the GitHub repository.
