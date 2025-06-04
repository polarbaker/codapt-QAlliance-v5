# Troubleshooting Guide

Comprehensive troubleshooting guide for the Quantum Alliance platform, covering common issues across development, deployment, and production environments.

## 🚨 Quick Diagnosis

### System Health Check
```bash
# Check all services
docker-compose ps

# Check application logs
docker-compose logs -f app

# Check memory usage
docker stats

# Check disk space
df -h

# Check database connection
docker-compose exec app npx prisma db pull
```

### Common Symptoms & Quick Fixes

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| White screen on load | Build/routing issue | `npm run build`, check browser console |
| 500 Internal Server Error | Database/environment issue | Check DATABASE_URL, restart services |
| Authentication failures | JWT/token issue | Check JWT_SECRET, clear browser storage |
| Image uploads failing | Memory/storage issue | Check Docker memory, Minio connection |
| Slow page loads | Database/query issue | Check database queries, add indexes |
| Build failures | Dependency/TypeScript issue | Clear cache, reinstall dependencies |

## 🛠️ Development Issues

### Build & Dependencies

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install

# Clear TypeScript cache
rm -rf .tsc-cache

# Regenerate Prisma client
npx prisma generate

# Check for TypeScript errors
npm run type-check
```

#### Dependency Issues
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Fix peer dependency warnings
npm install --legacy-peer-deps

# Clear npm cache
npm cache clean --force
```

### TypeScript Errors

#### Common TypeScript Issues
```typescript
// ❌ Incorrect tRPC usage
const data = trpc.getData.useQuery();

// ✅ Correct pattern
const trpc = useTRPC();
const data = trpc.getData.useQuery();
```

#### Type Generation Issues
```bash
# Regenerate route types
npm run build

# Check route tree generation
ls -la src/routeTree.gen.ts

# Manual route tree generation
npx tsr generate
```

### Development Server Issues

#### Port Conflicts
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Use different port
PORT=3001 npm run dev
```

#### Hot Reload Not Working
```bash
# Restart development server
npm run dev

# Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 🗄️ Database Issues

### Connection Problems

#### Database Connection Failures
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
docker-compose exec app npx prisma db pull

# Check database container
docker-compose logs db

# Restart database
docker-compose restart db
```

#### Connection String Issues
```bash
# Correct format
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# With Docker
DATABASE_URL="postgresql://postgres:password@db:5432/quantum_alliance"

# URL encode special characters
# @ becomes %40, : becomes %3A
```

### Migration Issues

#### Migration Failures
```bash
# Check migration status
npx prisma migrate status

# Reset database (development only)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate deploy

# Generate migration from schema changes
npx prisma migrate dev --name description
```

#### Schema Sync Issues
```bash
# Pull current database schema
npx prisma db pull

# Push schema changes without migration
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Query Performance

#### Slow Queries
```sql
-- Add indexes for common queries
CREATE INDEX idx_innovators_featured ON innovators(featured);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_uploads_user_created ON uploads(user_id, created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM innovators WHERE featured = true;
```

#### Database Optimization
```bash
# Check database size
docker-compose exec db psql -U postgres -d quantum_alliance -c "\l+"

# Vacuum and analyze
docker-compose exec db psql -U postgres -d quantum_alliance -c "VACUUM ANALYZE;"

# Check slow queries (if enabled)
docker-compose exec db psql -U postgres -d quantum_alliance -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## 🔐 Authentication Issues

### JWT Token Problems

#### Invalid or Expired Token Errors
```typescript
// Check token in browser storage
localStorage.getItem('user-store');

// Verify JWT secret configuration
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);

// Manual token validation
const jwt = require('jsonwebtoken');
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token valid:', decoded);
} catch (error) {
  console.log('Token invalid:', error.message);
}
```

#### Token Generation Issues
```bash
# Generate secure JWT secret (minimum 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check environment variable
echo $JWT_SECRET

# Verify secret in application
docker-compose exec app node -e "console.log(process.env.JWT_SECRET?.length)"
```

### Admin Authentication

#### Admin Login Failures
```bash
# Check admin password configuration
echo $ADMIN_PASSWORD

# Verify password hashing
docker-compose exec app node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password', 10);
console.log('Hash:', hash);
console.log('Verify:', bcrypt.compareSync('your-password', hash));
"
```

#### Session Management
```typescript
// Clear admin session
const { setAdminToken } = useUserStore();
setAdminToken(null);

// Check session state
const { adminToken, isAdminLoggedIn } = useUserStore();
console.log('Token:', adminToken);
console.log('Logged in:', isAdminLoggedIn());
```

## 🚦 Routing Issues

### TanStack Router Problems

#### Route Not Found (404)
```bash
# Check route file naming
# ✅ Correct: src/routes/about/index.tsx
# ❌ Incorrect: src/routes/about.tsx

# Regenerate route tree
npm run build

# Check generated routes
cat src/routeTree.gen.ts | grep -A 5 -B 5 "about"
```

#### Route Configuration Issues
```typescript
// Check route export
export const Route = createFileRoute('/about/')({
  component: AboutPage,
});

// Verify component is default export or named properly
export default function AboutPage() {
  return <div>About</div>;
}
```

### Navigation Issues

#### Links Not Working
```typescript
// ✅ Correct Link usage
import { Link } from '@tanstack/react-router';

<Link to="/about">About</Link>

// ❌ Incorrect - using React Router Link
import { Link } from 'react-router-dom'; // Wrong!
```

#### Search Parameters
```typescript
// Define search schema
const searchSchema = z.object({
  page: z.number().optional(),
  search: z.string().optional(),
});

// Use in route
export const Route = createFileRoute('/innovators/')({
  component: InnovatorsPage,
  validateSearch: searchSchema,
});
```

### Dynamic Routes

#### Parameter Issues
```typescript
// File: src/routes/admin/innovators/$innovatorId/index.tsx
export const Route = createFileRoute('/admin/innovators/$innovatorId/')({
  component: InnovatorDetail,
});

// Access parameters
function InnovatorDetail() {
  const { innovatorId } = Route.useParams();
  return <div>Innovator: {innovatorId}</div>;
}
```

## 🔌 API & tRPC Issues

### tRPC Connection Problems

#### Client Configuration Issues
```typescript
// Check tRPC client setup in src/trpc/react.tsx
const trpc = createTRPCReact<AppRouter>();

// Verify provider setup in __root.tsx
<TRPCReactProvider>
  {/* App content */}
</TRPCReactProvider>
```

#### Procedure Not Found
```typescript
// Check procedure registration in src/server/trpc/root.ts
export const appRouter = createTRPCRouter({
  getInnovators: getInnovators,
  createInnovator: createInnovator,
  // ... other procedures
});

// Verify import in procedure file
export { getInnovators } from './procedures/innovators';
```

### API Errors

#### 500 Internal Server Error
```bash
# Check server logs
docker-compose logs app | grep -i error

# Check database connection
docker-compose exec app npx prisma db pull

# Verify environment variables
docker-compose exec app env | grep -E "(DATABASE_URL|JWT_SECRET)"
```

#### CORS Issues
```typescript
// Check CORS configuration in app.config.ts
export default defineConfig({
  server: {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : true,
    },
  },
});
```

### Data Fetching Issues

#### Query Errors
```typescript
// ✅ Correct error handling
const trpc = useTRPC();
const { data, error, isLoading } = trpc.getInnovators.useQuery({
  search: 'AI',
});

if (error) {
  console.error('Query error:', error);
  return <div>Error: {error.message}</div>;
}
```

#### Mutation Errors
```typescript
// ✅ Proper mutation error handling
const createMutation = trpc.createInnovator.useMutation({
  onError: (error) => {
    console.error('Mutation error:', error);
    toast.error(`Failed to create innovator: ${error.message}`);
  },
  onSuccess: () => {
    toast.success('Innovator created successfully');
  },
});
```

## ⚡ Performance Issues

### Memory Problems

#### High Memory Usage
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check Node.js memory
docker-compose exec app node -e "
console.log('Memory usage:', process.memoryUsage());
console.log('Heap used:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
"

# Force garbage collection
docker-compose exec app node -e "
global.gc && global.gc();
console.log('GC triggered');
"
```

#### Memory Leaks
```typescript
// Check for memory leaks in components
useEffect(() => {
  const interval = setInterval(() => {
    // Some operation
  }, 1000);

  // ✅ Always cleanup
  return () => clearInterval(interval);
}, []);

// Avoid memory leaks in event listeners
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };

  window.addEventListener('resize', handleResize);
  
  // ✅ Cleanup listener
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Slow Loading

#### Bundle Size Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Check for large dependencies
npm ls --depth=0 | grep -E "\s[0-9]+\.[0-9]+\.[0-9]+$" | sort -k2 -n
```

#### Code Splitting
```typescript
// ✅ Lazy load large components
const AdminDashboard = lazy(() => import('~/components/admin/AdminDashboard'));

// ✅ Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Expensive rendering logic
});

// ✅ Optimize re-renders with useMemo
const expensiveValue = useMemo(() => {
  return heavyComputation(data);
}, [data]);
```

### Database Performance

#### Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_innovators_search 
ON innovators USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));

-- Analyze slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### Connection Pooling
```typescript
// Configure Prisma connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20',
    },
  },
});
```

## 🚀 Deployment Issues

### Docker Problems

#### Container Startup Failures
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app
docker-compose logs db
docker-compose logs minio

# Check resource usage
docker system df
docker system prune # Clean up unused resources
```

#### Build Issues
```bash
# Clean build
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up

# Check Dockerfile
docker build -t test-build .
docker run --rm test-build npm run build
```

### Environment Configuration

#### Missing Environment Variables
```bash
# Check required variables
docker-compose exec app node -e "
const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_PASSWORD'];
required.forEach(key => {
  console.log(key + ':', process.env[key] ? '✅ Set' : '❌ Missing');
});
"

# Copy from example
cp .env.example .env
# Edit .env with your values
```

#### Environment Variable Issues
```bash
# Check variable format
# ✅ Correct
DATABASE_URL="postgresql://user:pass@host:5432/db"

# ❌ Incorrect (quotes in wrong place)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Verify in container
docker-compose exec app printenv | grep DATABASE_URL
```

### Network Issues

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :3000
lsof -i :3000

# Change ports in docker-compose.yaml
services:
  app:
    ports:
      - "3001:3000"  # Use different external port
```

#### Service Communication
```bash
# Test internal networking
docker-compose exec app ping db
docker-compose exec app ping minio

# Check service names in environment
# Use service names, not localhost
DATABASE_URL="postgresql://user:pass@db:5432/quantum_alliance"
MINIO_ENDPOINT="minio"
```

### SSL/HTTPS Issues

#### Certificate Problems
```bash
# Check certificate validity
openssl x509 -in cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443

# Check nginx SSL configuration
docker-compose exec nginx nginx -t
```

#### Mixed Content Errors
```typescript
// Ensure all URLs use HTTPS in production
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://yourdomain.com' 
  : 'http://localhost:3000';
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Health Checks
```bash
# Basic health check
curl -f http://localhost:3000/health || echo "Health check failed"

# Database health
docker-compose exec app npx prisma db pull || echo "Database connection failed"

# Memory health
docker stats --no-stream | grep app
```

#### Log Analysis
```bash
# View application logs
docker-compose logs -f app

# Filter error logs
docker-compose logs app | grep -i error

# Check specific time period
docker-compose logs --since="2024-01-01T10:00:00" app

# Export logs
docker-compose logs app > app-logs.txt
```

### Performance Monitoring

#### Response Time Monitoring
```typescript
// Add timing to tRPC procedures
export const getInnovators = baseProcedure
  .input(getInnovatorsInputSchema)
  .query(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      const result = await db.innovator.findMany(/* ... */);
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`Slow query: getInnovators took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Query failed after ${duration}ms:`, error);
      throw error;
    }
  });
```

#### Resource Monitoring
```bash
# Monitor system resources
top -p $(docker inspect -f '{{.State.Pid}}' $(docker-compose ps -q app))

# Monitor disk usage
du -sh /var/lib/docker/
df -h

# Monitor network
docker-compose exec app netstat -i
```

### Error Tracking

#### Structured Logging
```typescript
// Implement structured logging
const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

#### Error Boundaries
```typescript
// Implement error boundaries
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    // Log to external service
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

## 🚨 Emergency Procedures

### System Recovery

#### Complete System Failure
```bash
# 1. Stop all services
docker-compose down

# 2. Check system resources
df -h
free -h

# 3. Clean up Docker
docker system prune -a

# 4. Restart services
docker-compose up -d

# 5. Check health
docker-compose ps
docker-compose logs app | tail -50
```

#### Database Recovery
```bash
# 1. Backup current state (if possible)
docker-compose exec db pg_dump -U postgres quantum_alliance > backup.sql

# 2. Reset database (last resort)
docker-compose down
docker volume rm $(docker volume ls -q | grep db)
docker-compose up -d db

# 3. Restore from backup
docker-compose exec -T db psql -U postgres quantum_alliance < backup.sql

# 4. Run migrations
docker-compose exec app npx prisma migrate deploy
```

### Data Recovery

#### File Storage Recovery
```bash
# Check Minio health
docker-compose exec minio mc admin info local

# List buckets
docker-compose exec minio mc ls local

# Restore bucket from backup
docker-compose exec minio mc mirror backup/ local/images/
```

#### Configuration Recovery
```bash
# Restore environment variables
cp .env.backup .env

# Restore Docker configuration
cp docker-compose.backup.yaml docker-compose.yaml

# Restart with restored configuration
docker-compose down
docker-compose up -d
```

### Rollback Procedures

#### Application Rollback
```bash
# 1. Stop current version
docker-compose down

# 2. Checkout previous version
git checkout previous-stable-tag

# 3. Rebuild and restart
docker-compose build
docker-compose up -d

# 4. Verify rollback
curl -f http://localhost:3000/health
```

#### Database Rollback
```bash
# 1. Check migration history
npx prisma migrate status

# 2. Rollback to specific migration
npx prisma migrate resolve --rolled-back migration_name

# 3. Apply corrected migrations
npx prisma migrate deploy
```

---

## 📞 Getting Help

### Before Seeking Help

1. **Check this guide** for your specific issue
2. **Search application logs** for error messages
3. **Verify environment configuration** 
4. **Test with minimal reproduction** case
5. **Document steps taken** and results

### Information to Include

When reporting issues, provide:

- **Error messages** (complete text)
- **Steps to reproduce** the issue
- **Environment details** (OS, Docker version, Node version)
- **Configuration** (anonymized environment variables)
- **Logs** (relevant application and system logs)
- **Timeline** (when issue started, recent changes)

### Support Channels

- **Technical Issues**: GitHub Issues
- **Security Issues**: Direct contact to security team
- **Performance Issues**: Include system metrics
- **Emergency Issues**: On-call engineering team

---

*This troubleshooting guide covers the most common issues. For specific problems not covered here, consult the relevant documentation sections or seek help through appropriate channels.*

*Last updated: [Current Date]*
*Version: 1.0.0*
