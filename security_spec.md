# 🛡️ Security Specification - Big Outsource EIMS

This document outlines the core security invariants, role-based access control (RBAC), and validation logic for the **Big Outsource Employee Information Management System (EIMS)**.

---

## 🔒 Data Invariants & Core Rules

To maintain data integrity across the system, the following invariants are strictly enforced:

- **Unique Identifiers:** An employee must have a unique `employeeId`.
- **Role Constraints:** User roles must strictly be one of: `super_admin`, `hr_admin`, `it_admin`, `viewer`.
- **Comprehensive Audit Trails:** Audit logs must invariably record at least the `timestamp`, `user_id`, and a description of the `action` taken.
- **Sensitive Data Isolation:** Highly sensitive data (e.g., Windows keys, external software credentials) must only be accessible by authorized IT or Super Admin roles. Accessing this data must trigger an audit log.

---

## 👥 Role Tiers & Permissions

The system utilizes a 4-tier Role-Based Access Control (RBAC) model:

1. **👑 Super Admin**: Full access to the entire system. Can manage all users, system settings, and records.
2. **🧑‍💼 HR Admin**: Can manage `/employees` HR-specific fields (e.g., contact info, site, status, department). **Cannot** modify IT-specific fields (Windows key, RustDesk, etc.).
3. **💻 IT Admin**: Can manage `/employees` IT-specific fields (hardware, software access, licenses). **Cannot** modify core HR fields (Site, Phone, etc.).
4. **👁️ Viewer**: Strictly read-only access to records based on their department or site visibility.

---

## 🚨 Security Rejection Criteria (The "Dirty Dozen")

The API and Supabase Row Level Security (RLS) policies are configured to actively reject the following payload attempts:

1. An **HR Admin** attempting to update IT fields like `windowsKey`.
2. An **IT Admin** attempting to update HR fields like `address` or `contactNumber`.
3. An **Anonymous (unauthenticated)** user attempting to read any system data.
4. Any user (including Super Admins) attempting to **delete** or modify an existing audit log.
5. A user attempting to promote their own role to `super_admin` via the `/users` endpoint.
6. A **Viewer** attempting to create, update, or archive an employee record.
7. An **IT Admin** attempting to archive or terminate an employee (strictly an HR action).
8. Creating an employee with a duplicate or conflicting ID.
9. Attempting to spoof `createdAt` or `updatedBy` fields with false timestamps.
10. A standard user or HR Admin attempting to read sensitive IT data without explicit authorization.
11. Attempting to disable or delete the primary seeded `super_admin` account.
12. Bulk deleting employees without explicit administrative authorization.

---

## 🛡️ Validation & Database Logic

- **Row Level Security (RLS):** Supabase RLS is heavily utilized to ensure that the rules above are enforced at the database level, preventing bypasses from direct API calls.
- **Timestamping:** All writes (Inserts/Updates) must automatically generate proper server-side timestamps.
- **Type Checking:** All payload fields must strictly match their specified PostgreSQL types and byte sizes.