# Quantum Alliance Platform

A full-stack TypeScript application for managing innovation challenges, innovators, partners, and case studies. Built with modern web technologies and designed for scalability, reliability, and excellent developer experience.

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library with modern hooks and concurrent features
- **TanStack Router** - Type-safe file-based routing with search parameter validation
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **@headlessui/react** - Unstyled, accessible UI components
- **Lucide React** - Modern icon library (^0.510.0)
- **React Hook Form** - Performant forms with minimal re-renders
- **React Hot Toast** - Elegant notification system

### Backend
- **tRPC** - End-to-end typesafe APIs with automatic client generation
- **Prisma ORM** - Type-safe database access with migrations
- **Zod** - Runtime type validation and schema definition
- **JSON Web Tokens** - Secure authentication and authorization
- **bcryptjs** - Password hashing and verification
- **Sharp** - High-performance image processing
- **Minio** - S3-compatible object storage for file management

### State Management
- **Zustand** - Lightweight state management with persistence
- **TanStack Query** - Server state management via tRPC integration

### Infrastructure
- **Docker & Docker Compose** - Containerized development and deployment
- **Nginx** - Reverse proxy and static file serving
- **PostgreSQL** - Primary database (via Prisma)

### Development Tools
- **TypeScript** - Static type checking and enhanced developer experience
- **ESLint & Prettier** - Code linting and formatting
- **Vite** - Fast build tool and development server

## 📁 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI components (buttons, forms, etc.)
│   │   └── admin/          # Admin-specific components
│   ├── routes/             # File-based routing (TanStack Router)
│   │   ├── __root.tsx      # Root layout and global providers
│   │   ├── index.tsx       # Homepage
│   │   ├── admin/          # Admin panel routes
│   │   └── ...             # Feature-specific routes
│   ├── server/             # Backend code (tRPC, database, scripts)
│   │   ├── trpc/           # tRPC procedures and routers
│   │   ├── scripts/        # Server initialization and utilities
│   │   ├── db.ts           # Database connection
│   │   └── env.ts          # Environment variable validation
│   ├── stores/             # Zustand state stores
│   ├── constants/          # Application constants and validation schemas
│   ├── trpc/               # tRPC client configuration
│   └── styles.css          # Global styles and Tailwind imports
├── prisma/
│   └── schema.prisma       # Database schema definition
├── docker/                 # Docker configuration
├── docs/                   # Documentation files
└── scripts/                # Development and deployment scripts
```

## 🚦 Routing Conventions

### File-Based Routing
- Use **TanStack Router** with file-based routing
- Route files must include "index.tsx" in filename to avoid clashing routes
- Examples: `some-page/index.tsx` or `some-page.index.tsx`
- Dynamic routes: `$paramName/index.tsx`
- Layout routes: `_layout.tsx`

### Route Structure
```typescript
// Basic route
export const Route = createFileRoute('/about/')({
  component: AboutPage,
})

// Route with search parameters (type-safe)
export const Route = createFileRoute('/innovators/')({
  component: InnovatorsPage,
  validateSearch: (search) => innovatorSearchSchema.parse(search),
})

// Protected route with authentication
export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
  beforeLoad: ({ location }) => {
    if (!isAdminLoggedIn()) {
      throw redirect({ to: '/admin/login' })
    }
  },
})
```

## 🔌 Backend API Patterns

### tRPC Procedures
- **Location**: `src/server/trpc/procedures/`
- **Registration**: Add to `src/server/trpc/root.ts`
- **No Headers**: Pass all data (including auth tokens) as parameters
- **No Middleware**: Use helper functions in procedures for authentication

### Procedure Structure
```typescript
// Query procedure
export const getInnovators = baseProcedure
  .input(getInnovatorsInputSchema)
  .query(async ({ input }) => {
    const { search, category, page = 1, limit = 10 } = input;
    
    return await db.innovator.findMany({
      where: { /* filters */ },
      skip: (page - 1) * limit,
      take: limit,
      include: { /* relations */ },
    });
  });

// Mutation procedure with authentication
export const createInnovator = baseProcedure
  .input(createInnovatorInputSchema)
  .mutation(async ({ input }) => {
    const { adminToken, ...data } = input;
    
    // Authentication helper
    await validateAdminToken(adminToken);
    
    return await db.innovator.create({
      data: data,
    });
  });
```

### Client-Side Usage
```typescript
// Correct pattern - assign hooks before using
const trpc = useTRPC();
const innovators = trpc.getInnovators.useQuery({ search: 'AI' });
const createMutation = trpc.createInnovator.useMutation({
  onSuccess: () => {
    toast.success('Innovator created successfully');
  },
});

// Incorrect pattern - avoid this
const innovators = trpc.getInnovators.useQuery({ search: 'AI' });
```

## 🏪 State Management

### Zustand Stores
- **Location**: `src/stores/`
- **Persistence**: Use Zustand Persist for auth tokens and user preferences
- **Global State**: Theme, user profile, admin authentication

### Store Structure
```typescript
interface UserStore {
  // Theme management
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Admin authentication
  adminToken: string | null;
  isAdminLoggedIn: () => boolean;
  setAdminToken: (token: string | null) => void;
  
  // User preferences
  likedComments: Set<string>;
  toggleLikeComment: (commentId: string) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Implementation
    }),
    {
      name: 'user-store',
      partialize: (state) => ({
        theme: state.theme,
        adminToken: state.adminToken,
        likedComments: Array.from(state.likedComments),
      }),
    }
  )
);
```

## 🎨 Styling System

### Tailwind CSS Configuration
- **Primary Framework**: Tailwind CSS with custom design system
- **Custom Styles**: Minimal custom CSS, prefer Tailwind utilities
- **Component Library**: HeadlessUI for accessible components

### Design Tokens
```css
/* Global utility classes */
.section-padding { @apply py-16 md:py-24; }
.container-padding { @apply px-4 sm:px-6 lg:px-8; }
.glass-effect { 
  @apply bg-white/10 backdrop-blur-sm border border-white/20; 
}

/* Button system */
.btn { @apply px-4 py-2 rounded-lg font-medium transition-colors; }
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
.btn-secondary { @apply bg-gray-200 text-gray-900 hover:bg-gray-300; }
```

### Component Patterns
- Use `className` prop for styling customization
- Implement responsive design with Tailwind breakpoints
- Follow atomic design principles (small, reusable components)
- Use consistent spacing and color schemes

## 🗄️ Database & Environment

### Database Schema
- **ORM**: Prisma with PostgreSQL
- **Migrations**: Automatic via Prisma
- **Models**: Defined in `prisma/schema.prisma`

### Key Models
```prisma
model Innovator {
  id          String   @id @default(cuid())
  name        String
  title       String?
  bio         String?
  image       String?
  website     String?
  linkedin    String?
  expertise   String[]
  featured    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Challenge {
  id          String   @id @default(cuid())
  title       String
  description String
  category    String
  status      String   @default("open")
  reward      String?
  deadline    DateTime?
  // ... additional fields
}
```

### Environment Configuration
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/quantum_alliance"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-minimum-32-chars"
ADMIN_PASSWORD="your-secure-admin-password"

# File Storage (Minio)
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL=false

# Image Processing
UPLOAD_MAX_FILE_SIZE=50 # MB
IMAGE_PROCESSING_MEMORY_LIMIT=2048 # MB
SHARP_CONCURRENCY=2
ENABLE_MEMORY_MONITORING=true

# Application
BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

## 🚀 Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development environment
npm run dev
# or
./scripts/run

# Database operations
npx prisma migrate dev    # Run migrations
npx prisma studio        # Database GUI
npx prisma generate      # Regenerate client
```

### Code Quality
```bash
# Linting and formatting
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # TypeScript

# Testing
npm run test            # Run tests
```

### Docker Development
```bash
# Start full stack
docker-compose up

# View logs
docker-compose logs -f app

# Database access
docker-compose exec db psql -U postgres -d quantum_alliance
```

## 📋 Best Practices

### React Hooks Rules
- **Top Level Only**: Call hooks only at the top level of components
- **Same Order**: Hooks must be called in the same order on every render
- **No Conditionals**: Avoid early returns before hook calls
- **React Functions Only**: Call hooks from React components or custom hooks

```typescript
// ✅ Good
function MyComponent() {
  const [state, setState] = useState(null);
  const query = trpc.getData.useQuery();
  
  if (loading) return <Spinner />;
  return <div>{/* content */}</div>;
}

// ❌ Bad - early return before hooks
function MyComponent() {
  if (loading) return <Spinner />;
  
  const [state, setState] = useState(null); // Hook after conditional!
  const query = trpc.getData.useQuery();
}
```

### Component Architecture
- **Atomic Design**: Build small, reusable components
- **Single Responsibility**: Each component should have one clear purpose
- **Props Interface**: Define clear TypeScript interfaces for props
- **Error Boundaries**: Implement error boundaries for robust UX

### Performance Optimization
- **Code Splitting**: Use dynamic imports for large components
- **Memoization**: Use `React.memo` and `useMemo` judiciously
- **Image Optimization**: Use appropriate formats and sizes
- **Bundle Analysis**: Monitor bundle size and dependencies

## 🔒 Security Considerations

### Authentication & Authorization
- **JWT Tokens**: Secure token generation and validation
- **Admin Access**: Protected admin routes and procedures
- **Token Storage**: Use Zustand Persist for secure token storage
- **Password Hashing**: bcryptjs for password security

### File Upload Security
- **File Validation**: Comprehensive file type and size validation
- **Content Scanning**: Basic malware detection
- **Path Validation**: Prevent directory traversal attacks
- **Rate Limiting**: Built-in upload throttling

### API Security
- **Input Validation**: Zod schemas for all inputs
- **Error Handling**: Sanitized error messages
- **CORS Configuration**: Proper cross-origin settings
- **Request Limits**: File size and request rate limits

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Docker memory limits set (6GB recommended)
- [ ] Minio bucket created and accessible
- [ ] JWT secret configured (minimum 32 characters)
- [ ] Admin password set
- [ ] SSL certificates installed
- [ ] Backup strategy implemented

### Docker Production Configuration
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 6gb
        reservations:
          memory: 3gb
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=4096
      - SHARP_CONCURRENCY=2
      - IMAGE_PROCESSING_MEMORY_LIMIT=2048
```

### Performance Monitoring
- **Memory Usage**: Monitor heap and RSS memory
- **Upload Success Rates**: Track image upload reliability
- **API Response Times**: Monitor tRPC procedure performance
- **Error Rates**: Track and alert on error patterns

## 🔧 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

#### Database Issues
```bash
# Reset database
npx prisma migrate reset

# Check connection
npx prisma db pull
```

#### Memory Issues
- Increase Docker memory limits
- Reduce image processing batch sizes
- Monitor memory usage with `docker stats`
- Check for memory leaks in application logs

#### Route Generation
- Ensure route files include "index.tsx"
- Check TanStack Router configuration
- Verify file naming conventions

### Debug Information
- **Development Mode**: Detailed error messages and stack traces
- **Memory Monitoring**: Real-time memory statistics
- **Upload Tracking**: Comprehensive upload logging
- **Performance Metrics**: Processing time tracking

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment variables: `cp .env.example .env`
4. Start development server: `npm run dev`
5. Run database migrations: `npx prisma migrate dev`

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow configured linting rules
- **Prettier**: Use consistent code formatting
- **Conventional Commits**: Use semantic commit messages

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation if needed
4. Submit PR with clear description
5. Address review feedback

### Testing
- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test tRPC procedures and database operations
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Monitor memory usage and response times

## 📞 Support & Resources

### Documentation
- **API Reference**: Auto-generated tRPC documentation
- **Component Library**: Storybook documentation (if available)
- **Database Schema**: Prisma Studio for visual schema exploration
- **Architecture Decisions**: ADR documents in `/docs`

### Development Resources
- **TanStack Router**: [Official Documentation](https://tanstack.com/router)
- **tRPC**: [Official Documentation](https://trpc.io)
- **Prisma**: [Official Documentation](https://prisma.io)
- **Tailwind CSS**: [Official Documentation](https://tailwindcss.com)

### Getting Help
- **Technical Issues**: Create GitHub issue with detailed reproduction steps
- **Feature Requests**: Submit feature request with use case description
- **Security Issues**: Contact security team directly
- **Performance Issues**: Include system specs and error logs

---

## 📄 License

This project is proprietary software. All rights reserved.

---

*Last updated: [Current Date]*
*Version: 1.0.0*
