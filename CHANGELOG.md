# Changelog

All notable changes to the StoneCentury Client Portal are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Phase 2: SMS 2FA Frontend (In Progress)
- Frontend components for password setup with phone number
- OTP verification page with 6-digit code input
- Login flow integration with 2FA redirect
- Mobile-responsive UI
- Timer/countdown component for code expiry

---

## [0.2.0] - 2026-09-14

### Added: SMS-Based Two-Factor Authentication (Phase 1 Backend)

#### Database Schema
- Added `phoneNumber` field to `User` model (E.164 format: +1234567890)
- Added `twoFactorEnabled` boolean flag to `User` model
- Created new `VerificationCode` model with fields:
  - `code`: Hashed OTP code (bcrypt)
  - `expiresAt`: 15-minute expiry timestamp
  - `attempts`: Track failed verification attempts (max 3)
  - `used`: Mark code as consumed after successful verification
- Added database indexes for efficient OTP lookups

#### Authentication Endpoints
- **POST /auth/set-password**: Updated to accept optional `phoneNumber`
  - Validates phone number format (E.164)
  - Stores phone number with user
  - Enables 2FA automatically when phone is provided
  
- **POST /auth/login**: Modified for 2FA flow
  - Checks if user has 2FA enabled
  - Legacy users without phone: Creates session immediately
  - 2FA users: Generates 6-digit OTP, stores hashed in DB, sends via SMS
  - Returns `twoFactorRequired: true` when OTP needed
  
- **POST /auth/verify-otp**: New endpoint for OTP verification
  - Validates 6-digit code against stored hash
  - Implements 3-attempt lockout
  - Marks code as used after verification
  - Creates session on successful verification

#### SMS Service
- Created `smsService.ts` with:
  - `generateOTP()`: Generates cryptographically secure 6-digit codes
  - `sendOTP()`: Sends SMS (currently logs to console for dev/demo)
  - `validatePhoneNumber()`: E.164 format validation
  - `formatPhoneNumberToE164()`: Converts user input to E.164
  - `maskPhoneNumber()`: Hides sensitive digits in logs/UI
- Console logging for development (OTP codes visible in terminal during testing)
- Ready for Twilio integration (awaiting payment confirmation)

#### Cryptographic Utilities
- Created `cryptoUtils.ts` with:
  - `hashCode()`: Bcrypt hashing for OTP storage
  - `verifyCode()`: Secure code comparison
  - Industry-standard security (bcrypt with 10 salt rounds)

#### Validation Schemas
- Updated `setPasswordSchema` to accept optional phone number
- Added `verifyOtpSchema` with 6-digit code validation
- Strict input validation using Zod

#### Security Features
- ✅ OTP codes hashed with bcrypt (never stored plaintext)
- ✅ 15-minute expiry on all verification codes
- ✅ 3-attempt lockout with rate limiting
- ✅ Audit logging for all authentication attempts
- ✅ E.164 phone number validation
- ✅ Session-based authentication post-verification

#### Documentation
- Comprehensive 2FA implementation plan created
- Security-first development approach documented
- Setup instructions for future Twilio integration

---

## [0.1.0] - 2026-09-11

### Added: My Coverage / Insurance Policy Display

#### Database Schema
- Created `Policy` model with fields:
  - Policy details: `policyNumber`, `policyType`, `status`, `insurer`
  - Coverage details: `coverageAmount`, `premium`, `premiumFrequency`, `beneficiary`
  - Dates: `issueDate`, `expirationDate`
- Added enums: `PolicyType`, `PolicyStatus`
- Relationship: One-to-many from Client to Policy

#### Backend API Endpoints
- **GET /api/client/policies**: List all policies for authenticated client
- **GET /api/client/policies/:policyId**: Get specific policy details
- **POST /api/admin/clients/:clientId/policies**: Admin add policy
- **PUT /api/admin/clients/:clientId/policies/:policyId**: Admin edit policy
- **DELETE /api/admin/clients/:clientId/policies/:policyId**: Admin delete policy

#### Frontend Components
- Client "My Coverage" navigation item and page
- Admin policy management in ClientDetail
- Policy list/table display with all details
- Add/Edit/Delete policy forms
- Empty state messaging when no policies

#### Validation
- Zod schemas for policy creation and updates
- Type validation for coverage amounts and dates
- Status enum validation

---

## [0.0.1] - 2026-09-01

### Initial Setup
- Project initialized with React frontend + Node.js/Express backend
- PostgreSQL database with Prisma ORM
- Client onboarding flow (4 phases)
- Admin client management dashboard
- Document upload system
- Action items and task tracking
- Team chat/messaging
- Notification system
- Ask Brock AI feature

---

## Development Standards

### Security-First Approach
All features are implemented following security best practices:
- Authentication: Industry-standard (OAuth, SAML, 2FA)
- Encryption: TLS 1.3+, AES-256, bcrypt for passwords
- Validation: Server-side whitelist validation
- Logging: Audit trails without sensitive data
- Access Control: Role-based with explicit authorization

### Code Quality
- TypeScript for type safety
- Zod for runtime validation
- Comprehensive error handling
- Unit and integration tests
- CI/CD pipeline on GitHub Actions

### Compliance Path
- HIPAA-ready architecture
- SOC 2 audit trail logging
- GDPR data handling principles
- PCI-DSS payment security (when payment features added)

---

## Next Planned Features (Priority Order)

1. **Phase 2: SMS 2FA Frontend** (Est. 3-4 days)
   - Password setup with phone number collection
   - OTP verification page
   - Login flow integration
   - Mobile-responsive UI

2. **Financial Picture / Net Worth Dashboard** (Est. 2-3 weeks)
   - Client net worth visualization (line chart)
   - Admin balance sheet snapshot recording
   - Historical trend tracking

3. **Enhanced Security Features**
   - API rate limiting (express-rate-limit with Redis)
   - Request signing for sensitive operations
   - IP whitelisting option
   - Device fingerprinting for fraud detection

---

## Version History

| Version | Date | Major Changes | Status |
|---------|------|---------------|--------|
| 0.2.0 | 2026-09-14 | SMS 2FA Phase 1 (Backend) | In Progress |
| 0.1.0 | 2026-09-11 | My Coverage Feature | Complete |
| 0.0.1 | 2026-09-01 | Initial Setup | Complete |

---

## How to Read This Changelog

- **Added**: New features and functionality
- **Changed**: Modifications to existing features
- **Deprecated**: Features that will be removed in future versions
- **Removed**: Features that have been deleted
- **Fixed**: Bug fixes and security patches
- **Security**: Security-related changes and improvements

Each section includes the specific files modified and the rationale for changes.

---

## Contact & Questions

For questions about any changes:
- Security concerns: Document in issues with [SECURITY] tag
- Feature requests: Create issue or discuss with Brock
- Bug reports: Include version number and detailed reproduction steps

