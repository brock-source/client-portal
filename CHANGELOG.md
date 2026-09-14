# Changelog

All notable changes to the StoneCentury Client Portal are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.1] - 2026-09-14

### Added: My Coverage Search, Filter, and Sort Enhancements

#### Search Functionality
- Multi-criteria search across policy number, insurer, beneficiary, and type
- Real-time search as user types
- Case-insensitive matching

#### Filtering Options
- **Filter by Status**: ACTIVE, INACTIVE, EXPIRED, LAPSED, CANCELLED, PENDING
- **Filter by Type**: LIFE, DISABILITY, LONG_TERM_CARE, UMBRELLA, HEALTH, OTHER
- Ability to combine filters for precise results

#### Sorting Capabilities
- Sort by policy number (alphabetical)
- Sort by policy type (alphabetical)
- Sort by coverage amount (high to low)
- Sort by premium (high to low)
- Sort by status (alphabetical)

#### User Experience Improvements
- Responsive control layout with CSS Grid (search input + 3 filter dropdowns)
- Result count display: "Showing X of Y policies"
- Empty filter state message: "No policies match your filters. Try adjusting your search or filters."
- All controls visible when policies exist
- Real-time filtering without page refresh
- All filtering performed client-side (no backend changes needed)

#### Files Changed
- `web/src/pages/MyCoverage.tsx` (UPDATED - added search, filter, sort state and logic)

#### Testing & Verification
- ✅ Search works across all policy fields
- ✅ Multi-filter combinations work correctly
- ✅ Sorting applies after filtering
- ✅ Result count updates in real-time
- ✅ Empty state message displays when appropriate
- ✅ Responsive design tested at multiple breakpoints

---

## [0.2.1] - 2026-09-14

### Added: SMS 2FA Phase 2 Frontend Components

#### Phone Number Utilities
- Created `phoneFormat.ts` with utilities:
  - `formatPhoneNumber()`: Live formatting as user types (123) 456-7890
  - `phoneToE164()`: Converts user input to E.164 format (+11234567890)
  - `isValidPhoneNumber()`: Validates E.164 format
  - `maskPhoneNumber()`: Hides sensitive digits for logging

#### SetPassword Page Updates
- Added optional phone number field during password setup
- Real-time phone number formatting
- Validation indicator (✓ Valid / ✗ Invalid)
- Helper text: "Optional - for secure two-factor verification"
- Converts phone input to E.164 before sending to backend
- Backend automatically enables 2FA when phone provided

#### Login Page Updates
- Detects 2FA requirement from login response
- Redirects to `/verify-otp?userId={userId}` when needed
- Supports legacy flow (no 2FA) for users without phone number

#### VerifyOTP Page (New)
- 6-digit code input with monospace formatting
- Real-time countdown timer (15 minutes)
- Numeric-only input validation
- Auto-disables input at 6 digits
- "Code expires in MM:SS" display
- "Back to Sign In" option for expired codes
- Clean error messaging for failed verifications

#### API Client Updates
- `login()`: Updated return type to include `twoFactorRequired` flag
- `setPassword()`: Added optional `phoneNumber` parameter
- `verifyOtp(userId, code)`: New endpoint for OTP verification

#### Routing
- Added `/verify-otp` route (not protected, part of auth flow)
- Proper redirect flow: Login → (if 2FA) → VerifyOTP → Dashboard

#### Security Features
- E.164 phone validation on frontend and backend
- OTP codes restricted to 6 digits only
- 15-minute expiry countdown display
- Server-side hashing of OTP codes (bcrypt)
- 3-attempt lockout (enforced by backend)

#### Testing & Verification
- ✅ Phone formatting works: "5551234567" → "(555) 123-4567"
- ✅ OTP input accepts 6 digits with proper spacing
- ✅ Verify button enables/disables based on code length
- ✅ Countdown timer updates in real-time
- ✅ Form validation prevents invalid submissions
- ✅ All components compile without errors
- ✅ Mobile-responsive design (tested at multiple breakpoints)

#### Files Changed
- `web/src/utils/phoneFormat.ts` (NEW)
- `web/src/pages/VerifyOTP.tsx` (NEW)
- `web/src/pages/SetPassword.tsx` (UPDATED - phone field added)
- `web/src/pages/Login.tsx` (UPDATED - 2FA redirect)
- `web/src/api/client.ts` (UPDATED - 2FA methods)
- `web/src/App.tsx` (UPDATED - /verify-otp route)

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

1. **Twilio SMS Integration** (Est. 1 day, awaiting payment confirmation)
   - Replace console logging with actual SMS sends
   - Set environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
   - Test end-to-end OTP delivery
   - Security: Phone number masking in logs

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
| 0.2.1 | 2026-09-14 | SMS 2FA Phase 2 (Frontend) | Complete |
| 0.2.0 | 2026-09-14 | SMS 2FA Phase 1 (Backend) | Complete |
| 0.1.1 | 2026-09-14 | My Coverage Search, Filter, Sort | Complete |
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

