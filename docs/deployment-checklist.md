# Deployment Checklist

## Pre-Deployment

- [ ] Environment variables set in Vercel
- [ ] Supabase production database migrated
- [ ] RLS policies active in production
- [ ] CSP headers configured
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Domain DNS verified
- [ ] SSL certificate valid
- [ ] Backup strategy defined
- [ ] Rollback plan documented

## Database

- [ ] All migrations applied
- [ ] Seed data loaded (if needed)
- [ ] Database backup taken
- [ ] Connection pooling configured

## Security

- [ ] RLS policies verified
- [ ] CORS origins restricted to production
- [ ] CSP headers set (no unsafe-inline)
- [ ] Rate limiting enabled on /api/validate-code
- [ ] No secrets in client bundle
- [ ] HTTPS enforced
- [ ] Session cookies httpOnly + secure

## Performance

- [ ] Images optimized
- [ ] Static assets cached
- [ ] API responses < 500ms p95
- [ ] Build size < 500KB

## Monitoring

- [ ] Error tracking configured
- [ ] Uptime monitoring enabled
- [ ] Performance monitoring enabled
- [ ] Alerts configured

## Post-Deployment

- [ ] Smoke test passed
- [ ] Health check endpoint responding
- [ ] DNS propagated
- [ ] SSL certificate valid
- [ ] Rollback plan tested
