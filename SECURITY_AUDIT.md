# Security Audit 

## GREEN / improved
- CSP + X-Frame-Options + nosniff + referrer/permissions policy.
- Same-origin mutation guard.
- JSON-only mutation endpoints.
- Body-size limits.
- Upload allowlist and per-file size limit.
- Randomized stored filenames.
-  extension/MIME/basic-signature checks for common file types.
- Upload files written with restrictive file mode on supported platforms.
- In-memory rate limiting for writes/classification/uploads.
- Server-side mutation/upload/ML-feedback audit table.
- Path traversal protection for public/static/upload serving.

## RED — must be fixed before production
- No password authentication/session/JWT/SSO.
- Role entry is client-side/localStorage identity.
- `/api/state` is a shared state document; no object-level authorization.
- An unauthenticated same-origin client can mutate state.
- Direct per-resource authorization cannot be meaningfully enforced until state is normalized into server-side resource tables.
- CSRF tokens are not implemented; current Origin guard is not equivalent to authenticated CSRF protection.

## Not implemented production controls
- Malware scanning/content disarm.
- Secret management/KMS.
- Production CORS allowlist configuration for separate frontend/backend origins.
- Password hashing/token expiration because production auth itself is not implemented.
- Formal penetration test/security certification.

The prototype intentionally reports these limitations instead of hiding them.
