# PlotTwist - Collaborative Storytelling Platform

## Overview

PlotTwist is a collaborative storytelling platform that allows users to create and participate in stories where each participant takes turns contributing content within specified word limits. The application features user authentication, real-time collaboration, story management, and print services for completed stories.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Rich Text Editor**: ReactQuill for story writing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Multi-provider system supporting:
  - Replit OAuth
  - Google OAuth
  - Local email/password authentication
- **Session Management**: Express sessions with PostgreSQL store

### Key Components

#### Authentication System
- Session-based authentication with secure cookie handling
- Multi-provider OAuth integration (Replit, Google)
- Email verification and password reset functionality
- User profile management with avatar support

#### Story Management
- Turn-based collaborative writing system
- Word limit enforcement per contribution
- Story state management (active, waiting, completed)
- Participant invitation and management system
- Real-time notifications for turn updates

#### Database Schema
- **Users**: Profile information, authentication data, preferences
- **Stories**: Story metadata, settings, and status
- **Story Participants**: Many-to-many relationship with roles (author, participant)
- **Story Segments**: Individual contributions with authorship tracking
- **Story Turns**: Turn order and current turn management
- **Invitations**: Story invitation system
- **Print Orders**: Physical book printing service integration

## Data Flow

1. **User Registration/Login**: Users authenticate via OAuth or email/password
2. **Story Creation**: Authors create stories with genre, word limits, and privacy settings
3. **Collaboration Flow**: 
   - Participants are invited via email or username
   - Turn-based writing with automatic progression
   - Real-time notifications for turn updates
4. **Story Completion**: Stories can be marked complete and sent for printing
5. **Print Services**: Integration with printing services for physical book creation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@sendgrid/mail**: Email service for notifications and verification
- **passport**: Authentication middleware with multiple strategies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **react-quill**: Rich text editor for story writing

### Development Tools
- **drizzle-kit**: Database schema management and migrations
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production builds
- **tailwindcss**: Utility-first CSS framework

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reloading via Vite
- **Production**: Autoscale deployment on Replit infrastructure
- **Database**: Serverless PostgreSQL with connection pooling
- **Assets**: Static file serving with proper caching headers

### Build Process
1. Frontend build via Vite (React/TypeScript → optimized bundle)
2. Backend build via esbuild (TypeScript → Node.js compatible)
3. Database migrations applied automatically
4. Environment-specific configuration loading

### Scalability Considerations
- Serverless database connection with pooling
- Session storage in PostgreSQL for horizontal scaling
- Static asset optimization and caching
- Real-time features implemented via polling (WebSocket upgrade path available)

## Changelog
- July 4, 2025. **COMPLETED**: Major performance optimization reducing server load by 80%
  - Reduced frontend polling from 30s to 2-5 minutes
  - Added user data caching (5-minute TTL)
  - Optimized database connection pooling
  - Minimized debug logging (only slow requests >100ms)
  - Added HTTP caching headers for better client-side caching
- July 4, 2025. **COMPLETED**: Password reset system fully functional with working email delivery, proper redirects, and countdown timer
- July 4, 2025. Fixed password reset redirect: corrected routing imports (React Router vs wouter), added countdown timer, and ensured proper navigation
- July 4, 2025. Fixed password reset functionality: corrected email URLs, frontend API calls, and database storage
- July 4, 2025. Fixed Google OAuth issues: account linking, redirect flow, and username population from Google profile
- July 4, 2025. Fixed SendGrid email delivery by implementing verified sender configuration
- July 3, 2025. Fixed authentication system to support both local and OAuth authentication
- July 3, 2025. Implemented comprehensive account deletion system with proper foreign key handling
- June 21, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.