# Pre-Production Security Checklist
## CotizaPro SaaS Application

**Use this checklist before deploying to production**

---

## Phase 1: Critical Fixes (Must Do First)

### Cron Security
- [ ] Validate CRON_SECRET exists before use
- [ ] Check minimum length (32+ characters)
- [ ] Use constant-time comparison for auth validation
- [ ] Add logging for auth failures
- [ ] Test without token (should return 401)
- [ ] Test with wrong token (should return 401)
- [ ] Test with correct token (should return 200)

### Webhook Security
- [ ] Validate STRIPE_WEBHOOK_SECRET exists before use
- [ ] Validate signature header exists
- [ ] Test webhook with invalid signature (should return 400)
- [ ] Test webhook with valid signature (should return 200)
- [ ] Verify idempotency key prevents duplicate processing
- [ ] Check webhook_events table exists before inserting

### Email Security (XSS Prevention)
- [ ] Install HTML escaping library: `npm install html-entities`
- [ ] Escape user input in reminder descriptions
- [ ] Escape user input in quote descriptions
- [ ] Test with malicious HTML: `<img src=x onerror="alert('xss')">`
- [ ] Verify output is escaped (no script execution)
- [ ] Test with special characters: `<>&"'`
- [ ] Check email preview shows escaped content

### .gitignore Verification
- [ ] Confirm .gitignore exists in root
- [ ] Verify .env.local is ignored
- [ ] Verify .env.*.local is ignored
- [ ] Check git status (no env files should be staged)
- [ ] Confirm no secrets in git history
- [ ] Run: `git log --all -p | grep -i "secret\|password\|key"`

---

## Phase 2: High Priority (Week 1)

### Security Headers
- [ ] Create/Update `next.config.js`
- [ ] Add X-Content-Type-Options header
- [ ] Add X-Frame-Options header
- [ ] Add X-XSS-Protection header
- [ ] Add Referrer-Policy header
- [ ] Add Content-Security-Policy header
- [ ] Test with: `curl -I http://localhost:3000`
- [ ] Verify all headers present
- [ ] Use https://securityheaders.com to validate
- [ ] Grade should be A or A+

### Rate Limiting
- [ ] Install rate limiting: `npm install express-rate-limit`
- [ ] Create `lib/rate-limit.ts` with limiters
- [ ] Apply to `/api/clients` endpoints
- [ ] Apply to `/api/quotes` endpoints
- [ ] Apply to `/api/team` endpoints
- [ ] Apply to message endpoints (send quote, send reminder)
- [ ] Test rate limit: send 110 requests, should get 429 on 101st
- [ ] Verify rate limit response headers
- [ ] Configure appropriate thresholds for each endpoint
- [ ] Test that successful requests don't count toward limit (if configured)

### Error Sanitization
- [ ] Create `lib/errors.ts` with sanitized error responses
- [ ] Update all API routes to use sanitized errors
- [ ] Remove direct error.message exposure
- [ ] Test with invalid request (should get generic error)
- [ ] Verify database errors don't leak to client
- [ ] Check error logs for internal details (server-side OK)
- [ ] Ensure validation errors still helpful to client

### Logging Security
- [ ] Create `lib/logger.ts` with PII sanitization
- [ ] Identify PII fields: email, phone, password, token, secret, key
- [ ] Replace all `console.log` with `logger.info`
- [ ] Replace all `console.error` with `logger.error`
- [ ] Remove or redact email addresses from logs
- [ ] Remove or redact phone numbers from logs
- [ ] Test that sensitive data is [REDACTED] in logs
- [ ] Verify logs still contain useful debugging info

---

## Phase 3: Medium Priority (Week 2)

### Quote Ownership Validation
- [ ] Add organization_id check when fetching quotes
- [ ] Add organization_id check when updating quotes
- [ ] Add organization_id check when deleting quotes
- [ ] Add organization_id check when sending quotes
- [ ] Test cross-organization access (should be denied)
- [ ] Verify 404 returned for non-existent quotes

### Search Filter Safety
- [ ] Add input validation for search patterns
- [ ] Whitelist alphanumeric + allowed special chars
- [ ] Test with SQL injection: `'; DROP TABLE clients; --`
- [ ] Verify injection is rejected or safely handled
- [ ] Test with special chars: `<>\"'`
- [ ] Ensure search still works with legitimate input

### Request Size Limits
- [ ] Add bodyParser sizeLimit to `next.config.js`
- [ ] Set global limit (10MB recommended)
- [ ] Set per-route limits if needed (5MB for quotes)
- [ ] Test with large payload (should return 413)
- [ ] Verify legitimate uploads still work
- [ ] Test PDF generation doesn't exceed limits

### Plan-Based Rate Limiting (Optional)
- [ ] Implement usage tracking table
- [ ] Enforce free tier limits: 3 projects, 100 API calls/day
- [ ] Enforce starter tier limits: 10 projects, 10k API calls/day
- [ ] Enforce pro tier limits: unlimited
- [ ] Add usage indicator in API responses
- [ ] Block requests when limit exceeded
- [ ] Add alert when limit approaching (90%)

---

## Phase 4: Testing & Validation

### Security Scanning
- [ ] Run npm audit: `npm audit --audit-level=high`
- [ ] Run secret detection: `detect-secrets scan`
- [ ] Check for hardcoded API keys/secrets
- [ ] Review all environment variable references
- [ ] Confirm no secrets in comments or strings

### Authentication Testing
- [ ] Test with no authentication token (should return 401)
- [ ] Test with expired token (should redirect to login)
- [ ] Test with invalid token (should return 401)
- [ ] Test with valid token (should succeed)
- [ ] Test organization isolation (cross-org access denied)
- [ ] Test role-based access (viewer can't modify)

### API Testing
- [ ] GET endpoints require authentication
- [ ] POST endpoints require authentication
- [ ] PATCH endpoints require authentication
- [ ] DELETE endpoints require authentication
- [ ] All responses have proper status codes
- [ ] Error messages are sanitized
- [ ] No PII in error responses
- [ ] Large payloads are rejected
- [ ] Rate limits are enforced

### XSS Testing
- [ ] Test with script tags: `<script>alert('xss')</script>`
- [ ] Test with img onerror: `<img src=x onerror="alert('xss')">`
- [ ] Test with event handlers: `<div onclick="alert('xss')">`
- [ ] Test with SVG: `<svg onload="alert('xss')">`
- [ ] Verify all are escaped in HTML output
- [ ] Verify no console errors in browser

### CSRF Testing
- [ ] Verify SameSite cookies set to Strict/Lax
- [ ] Test from cross-origin request (should fail)
- [ ] Test same-origin request (should succeed)
- [ ] Review CSRF token implementation

### Database Security
- [ ] Verify RLS policies enabled on all tables
- [ ] Test organization_id enforcement
- [ ] Verify users can't access other orgs' data
- [ ] Test role-based RLS policies
- [ ] Check for N+1 query problems
- [ ] Verify indexes on frequently queried columns

---

## Phase 5: Infrastructure & Deployment

### Environment Setup
- [ ] CRON_SECRET set to 32+ random characters
- [ ] STRIPE_WEBHOOK_SECRET configured
- [ ] STRIPE_SECRET_KEY not exposed in client code
- [ ] SUPABASE_SERVICE_ROLE_KEY stored securely
- [ ] All required env vars configured
- [ ] No env vars hardcoded in code
- [ ] .env files not in git history

### Database Setup
- [ ] All migrations applied
- [ ] RLS policies enabled on all tables
- [ ] Indexes created for performance
- [ ] webhook_events table exists for idempotency
- [ ] Automatic backups configured
- [ ] Backup retention set to 30+ days

### Deployment Setup
- [ ] HTTPS enforced on all routes
- [ ] SSL certificate valid (non-self-signed)
- [ ] Redirect HTTP → HTTPS
- [ ] Security headers configured
- [ ] CSP policy tested and validated
- [ ] Rate limiting working in production
- [ ] Error tracking configured (Sentry, LogRocket, etc.)
- [ ] Monitoring and alerting set up

### Secrets Management
- [ ] Secrets stored in environment variables, not code
- [ ] Secrets not logged or printed
- [ ] Stripe keys accessible only server-side
- [ ] Supabase service role key secured
- [ ] CRON_SECRET never shared in code
- [ ] No default/example secrets in .env.example

---

## Phase 6: Post-Deployment Monitoring

### Security Monitoring
- [ ] Monitor failed authentication attempts
- [ ] Alert on rate limit hits (unusual patterns)
- [ ] Monitor webhook delivery failures
- [ ] Track API error rates
- [ ] Monitor for SQL injection attempts
- [ ] Monitor for XSS attempts
- [ ] Check logs for suspicious activity

### Performance Monitoring
- [ ] Monitor API response times
- [ ] Monitor database query performance
- [ ] Track rate limit rejection rate
- [ ] Monitor email delivery failures
- [ ] Track WhatsApp delivery failures
- [ ] Monitor cron job execution
- [ ] Check for N+1 queries in logs

### Incident Response
- [ ] Have incident response plan
- [ ] Know how to contact Stripe support
- [ ] Know how to contact Supabase support
- [ ] Have database backup procedures
- [ ] Have secret rotation procedures
- [ ] Have rollback procedures

---

## Compliance & Documentation

### Documentation
- [ ] Security policies documented
- [ ] Data retention policies documented
- [ ] Privacy policy created and published
- [ ] Terms of service created
- [ ] Data processing agreement (if applicable)
- [ ] Security incident procedures documented
- [ ] Deployment procedures documented

### Compliance
- [ ] GDPR compliance reviewed (if EU users)
- [ ] CCPA compliance reviewed (if CA users)
- [ ] Personal data handling documented
- [ ] Data deletion procedures documented
- [ ] Data export procedures documented
- [ ] Cookie consent configured
- [ ] Privacy policy mentions security practices

---

## Sign-Off

### Team Sign-Off
- [ ] Security review completed by: _______________
- [ ] Code review completed by: _______________
- [ ] QA testing completed by: _______________
- [ ] Product approval by: _______________

### Approval Status
- [ ] All critical issues resolved
- [ ] All high issues resolved
- [ ] Documentation complete
- [ ] Testing complete
- [ ] Approved for production deployment

**Date Approved:** _______________
**Deployment Date:** _______________
**Version Deployed:** _______________

---

## Post-Launch Review (30 days)

- [ ] No security incidents
- [ ] Error rates normal
- [ ] Rate limiting working as expected
- [ ] Email delivery successful
- [ ] Database backups successful
- [ ] No spike in support requests
- [ ] Performance metrics stable
- [ ] User feedback positive
- [ ] All alerts configured and functioning

---

## Annual Security Review

- [ ] OWASP Top 10 reassessed
- [ ] Dependency audit performed
- [ ] Third-party security assessment
- [ ] Penetration testing completed
- [ ] Database schema security reviewed
- [ ] API security review
- [ ] Authentication flow review
- [ ] Disaster recovery tested
- [ ] Incident response procedures tested

---

**This checklist must be completed before production deployment.**

**Total estimated time to complete all phases: 10-12 hours**

**For questions, refer to:**
- SECURITY_AUDIT_REPORT.md (detailed findings)
- SECURITY_FIXES.md (implementation guide)
- SECURITY_SUMMARY.md (executive summary)
