# NU-Laguna e-Registrar System
## Overview

The NU Laguna e-Registrar is a web-based system designed to streamline the process of requesting official academic documents such as Transcript of Records (TOR), certificates, and copy of grades.

Instead of physically visiting the registrar’s office, students and alumni can:

- Submit document requests online
- Track request status in real time
- Pay securely through a sandbox payment gateway
- Receive intelligent, AI-enhanced email notifications
## Objectives
- Eliminate manual and paper-based request processes
- Improve efficiency of registrar operations
- Provide convenience for students and alumni
- Ensure secure and verified access to academic documents
## Target Users
- Students – Request academic documents
- Alumni – Request TOR and certificates after verification
- Registrar Staff (Admin) – Manage requests and verify accounts
## Core Features
### Account-Based Authentication
- Secure login system for students, alumni, and registrar
- Role-based access control
- Alumni accounts require manual registrar verification
### Alumni Registration and Verification
- Alumni must register with academic details
- Accounts are marked as "Pending Verification"
- Registrar manually validates before activation
## Online Document Request

Users can request documents such as:

- Transcript of Records (TOR) (per set)
- Certificate of Registration (COR)
- Certificates
- Certificate of Good Moral Character
- Copy of Grades
- Course Curriculum
- Course Description 1st Page
  - Succeeding Pages
- Load Revision Form & Processing
- Shifting Form
- SHS Report Card
- SHS SF10 / Form 137A
## Request Tracking System

Real-time status updates:

- Pending
- Processing
- Ready for Pickup
- Released
## Payment Integration (Sandbox)
- Supports online payment (GCash, Maya – sandbox mode)
- Secure and trackable transactions
## Smart Notification System (AI-Enhanced)
- Sends context-aware and personalized email notifications
- Provides:
  - Status updates
  - Suggested pickup times
  - Clear and user-friendly messages
## Admin Dashboard
- Manage document requests
- Approve or reject alumni registrations
- Update request statuses
- Monitor system activity
## System Workflow
### Student Workflow
1. Login
2. Submit request
3. Validate input
4. Proceed to payment
5. Registrar processes request
6. Receive email notification
7. Pick up document
### Alumni Workflow
1. Register account
2. Status: Pending Verification
3. Registrar approves or rejects
4. If approved, login
5. Submit request
6. Proceed to payment
7. Registrar processes request
8. Receive notification
9. Pick up document
## Technology Stack
- Frontend: React, HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB
- Email Service: Nodemailer
- Payment Gateway: PayMongo (Sandbox)
- Authentication: Role-based login system
## Security Features
- Account-based authentication
- Role validation (Student, Alumni, Registrar)
- Alumni manual verification by registrar
- Duplicate request detection
- Controlled access to sensitive data
## Project Structure 
```
/frontend     # React frontend
/backend      # Node.js backend (API)
/database     # Database models and schema
```
## Testing
- Functional testing of all features
- Integration testing (frontend and backend)
- Payment and notification testing
- Edge case validation (invalid inputs, duplicate requests)
## Team Members

Group 4

- Project Lead: John Simon Ray Umadac
- Developer Lead: John Simon Ray Umadac
- Project Manager: John Simon Ray Umadac
- Quality Assurance Lead: John Simon Ray Umadac
- Design Lead: Lyka Marco
- Frontend Developers: Byron Capulong, Christian De Ocampo
- Backend Developers: Kyle Justine Paras, John Simon Ray Umadac
- AI Specialist: John Simon Ray Umadac
- Web Designer: Faith Barba
- Quality Assurance: Antonio Luis Ignacio
## Project Timeline
- Start Date: April 08, 2026
- End Date: June 05, 2026
## Future Enhancements
- SMS notification support
- Mobile application version
- Advanced AI features (predictive processing time, chatbot)
## License

This project is developed for academic purposes.
