# Role Protection Implementation

Users can no longer switch their role between 'applicant' and 'reviewer' after initial setup.

## Changes Made

### 1. Frontend Protection (UI Layer)
**File**: [app/profile/page.tsx](app/profile/page.tsx)

- Removed the role selector buttons from the profile edit page
- Replaced with a read-only display showing the current role
- Role field is excluded from profile update queries
- Users see: "(Role cannot be changed after initial setup)"

### 2. Database Protection (Data Layer)
**Files**:
- [scripts/prevent-role-changes.sql](scripts/prevent-role-changes.sql) - Migration script
- [scripts/setup-database.js](scripts/setup-database.js) - Updated for new databases

Added a PostgreSQL trigger that prevents role changes at the database level:
- `prevent_role_change()` function - Validates role immutability
- `enforce_immutable_role` trigger - Executes before any profile update
- Raises an exception if someone tries to change their role

## Applying the Database Migration

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/hoevksqthngrlsmrancx/sql/new

2. Copy and paste the contents of `scripts/prevent-role-changes.sql`

3. Click "Run" to execute

### Option 2: Using the Migration Script

```bash
npm run migrate:role-protection
```

This will display the SQL you need to run in the Supabase dashboard.

## How It Works

### User Flow
1. **Onboarding** (First Time): User selects their role (applicant or reviewer)
2. **Profile Edit** (Ongoing): Role is displayed but cannot be changed
3. **Database Level**: Any attempt to modify role field triggers an error

### Protection Layers

| Layer | Protection | Can Bypass? |
|-------|-----------|-------------|
| UI | Role selector removed | Yes (via API) |
| Application | Role excluded from updates | Yes (direct DB) |
| Database | PostgreSQL trigger | **No** |

### Example Error

If someone tries to change their role via direct database access:

```
ERROR: Role cannot be changed after initial setup
```

## Testing Role Protection

You can test that role changes are blocked:

```typescript
// This will fail with an error
await supabase
  .from('profiles')
  .update({ role: 'reviewer' })
  .eq('id', userId)

// Expected error: "Role cannot be changed after initial setup"
```

## Onboarding Flow

The role selection is still available during onboarding:
- **File**: [app/onboarding/page.tsx](app/onboarding/page.tsx)
- Users choose their role once during initial setup
- After onboarding is complete, role becomes immutable

## Future Considerations

If you need to manually change a user's role (admin operation):

1. Temporarily disable the trigger:
   ```sql
   ALTER TABLE public.profiles DISABLE TRIGGER enforce_immutable_role;
   ```

2. Make the role change:
   ```sql
   UPDATE public.profiles SET role = 'reviewer' WHERE id = 'user-uuid';
   ```

3. Re-enable the trigger:
   ```sql
   ALTER TABLE public.profiles ENABLE TRIGGER enforce_immutable_role;
   ```

**Note**: This should only be done by administrators with direct database access.
