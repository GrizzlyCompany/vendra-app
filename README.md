# Vendra App - Enterprise Real Estate Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.56.0-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)](https://tailwindcss.com/)
[![Jest](https://img.shields.io/badge/Jest-30.1.3-red)](https://jestjs.io/)
[![Playwright](https://img.shields.io/badge/Playwright-1.55.0-2EAD33)](https://playwright.dev/)

A production-ready, enterprise-grade real estate platform built with modern web technologies. Vendra provides a comprehensive solution for property listings, user management, and real estate transactions with a focus on performance, security, and user experience.

## 🚀 Features

### Core Functionality
- 🏠 **Advanced Property Management**: Create, edit, and manage property listings with rich media support
- 🔍 **Intelligent Search**: AI-powered search with filters for location, price, type, amenities, and more
- 👤 **Multi-Role User System**: Support for buyers, agents, and construction companies
- 📱 **Progressive Web App**: Mobile-first design with offline capabilities
- 💬 **Real-time Messaging**: Built-in communication system between buyers and sellers
- 📊 **Analytics Dashboard**: Comprehensive insights and performance metrics
- 🔐 **Enterprise Security**: Multi-factor authentication and role-based access control

### Technical Features
- ⚡ **High Performance**: Optimized with code splitting, lazy loading, and caching
- 🛡️ **Type Safety**: 100% TypeScript coverage with strict type checking
- ♿ **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- 🌐 **Internationalization**: Multi-language support with RTL layout
- 📈 **SEO Optimized**: Server-side rendering with dynamic meta tags
- 🔄 **Real-time Updates**: Live property status and messaging updates

## 🏗️ Architecture

### Tech Stack
- **Frontend Framework**: Next.js 15.5.0 with App Router
- **Language**: TypeScript 5.0 with strict mode
- **Styling**: Tailwind CSS 4.0 with custom design system
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **UI Components**: Radix UI primitives with custom theming
- **State Management**: React hooks with context and reducers
- **Testing**: Jest + React Testing Library + Playwright
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/             # Reusable React components
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── forms/             # Form components with validation
│   ├── layout/            # Layout components
│   └── transitions/       # Animation components
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts         # Authentication hook
│   ├── useProperties.ts   # Property management
│   └── useStats.ts        # Analytics and statistics
├── lib/                    # Utility libraries
│   ├── supabase/          # Database client and queries
│   ├── validation.ts      # Zod validation schemas
│   ├── safe.ts           # Defensive programming utilities
│   └── utils.ts          # General utilities
├── types/                  # TypeScript type definitions
└── middleware.ts          # Next.js middleware for auth
```

### Database Schema
- **Users**: Multi-role user management with profiles
- **Properties**: Rich property listings with media and metadata
- **Projects**: Construction company project management
- **Messages**: Real-time messaging system
- **Reviews**: User rating and review system
- **Analytics**: Property views and user engagement tracking

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.0 or higher
- **npm**: 8.0 or higher (comes with Node.js)
- **Supabase Account**: [Create a free account](https://supabase.com)
- **Git**: For version control

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-username/vendra-app.git
cd vendra-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env.local
```

Configure your `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics and Monitoring
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Development
NODE_ENV=development
```

4. **Database Setup**
```bash
# Run the database migrations
npm run db:setup
```

Or manually execute `supabase/schema.sql` in your Supabase SQL editor.

5. **Start Development Server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

### Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run preview        # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
npm run test:e2e        # Run end-to-end tests

# Database
npm run db:setup        # Setup database schema
npm run db:seed         # Seed database with sample data
npm run db:migrate      # Run database migrations
```

## 🧪 Testing

Vendra has comprehensive test coverage including:

### Unit Tests
```bash
npm run test
```
- Component testing with React Testing Library
- Hook testing with custom utilities
- Utility function testing
- Validation schema testing

### Integration Tests
```bash
npm run test:e2e
```
- End-to-end user journey testing
- API integration testing
- Database operation testing

### Test Coverage
Current coverage includes:
- ✅ Components (95%+ coverage)
- ✅ Hooks (90%+ coverage)
- ✅ Utilities (100% coverage)
- ✅ Validation schemas (100% coverage)
- ✅ Error boundaries (95%+ coverage)

## 📦 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker Deployment
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM base AS production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm run start
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics tracking ID | ❌ |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking | ❌ |
| `DATABASE_URL` | Direct database connection | ❌ |

### Supabase Configuration

1. **Authentication**: Configure auth providers in Supabase dashboard
2. **Storage**: Set up buckets for images and documents
3. **Edge Functions**: Deploy serverless functions if needed
4. **Realtime**: Enable realtime subscriptions for live updates

## 📚 API Documentation

### REST API Endpoints

#### Properties
- `GET /api/properties` - List properties with filters
- `POST /api/properties` - Create new property
- `GET /api/properties/[id]` - Get property details
- `PUT /api/properties/[id]` - Update property
- `DELETE /api/properties/[id]` - Delete property

#### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/[id]` - Get public user profile

#### Messages
- `GET /api/messages` - Get user messages
- `POST /api/messages` - Send new message
- `PUT /api/messages/[id]/read` - Mark message as read

### Database Schema

Key tables include:
- `users` - User accounts and profiles
- `properties` - Property listings
- `projects` - Construction projects
- `messages` - User communications
- `reviews` - User ratings and reviews
- `property_views` - Analytics tracking

See `supabase/schema.sql` for complete schema definition.

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
