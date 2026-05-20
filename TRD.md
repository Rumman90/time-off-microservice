# Technical Requirement Document (TRD)

# Time-Off Microservice

Version: 1.0  
Technology Stack: TypeScript, NestJS, TypeORM, SQLite

---

# 1. Introduction

The Time-Off Microservice is a backend service responsible for handling employee leave requests, manager approvals, HCM synchronization, realtime status updates, and audit logging.

The service demonstrates modern backend architecture patterns including:

```txt
asynchronous workflow orchestration
outbox processing
repository pattern
dependency injection
idempotency protection
event streaming
retry handling
audit logging
```

The system treats HCM as the official source of truth for leave balances while maintaining local workflow state and cached balance projections.

---

# 2. Objective

The objective of the system is to:

```txt
allow employees to request leave
allow managers to approve/reject leave
validate balances against HCM
synchronize approved leave deductions
provide realtime frontend updates
maintain auditability
handle retries safely
protect HCM from traffic spikes
```

---

# 3. High-Level Architecture

```txt
Frontend
   ↓
API Gateway / Reverse Proxy
   ↓
Time-Off Microservice
   ↓
SQLite Database
   ↓
Outbox Worker
   ↓
Mock HCM
```

---

# 4. Architectural Decisions

## 4.1 NestJS

NestJS was selected because it provides:

```txt
dependency injection
module architecture
controller/service separation
scalability
maintainability
testing support
```

---

## 4.2 TypeORM

TypeORM was selected to provide:

```txt
repository pattern
entity management
database abstraction
clean TypeScript integration
```

---

## 4.3 SQLite

SQLite was selected because:

```txt
assessment requirement
lightweight setup
easy local execution
minimal infrastructure dependency
```

In production, SQLite can be replaced with:

```txt
PostgreSQL
MySQL
SQL Server
```

without major architectural changes.

---

## 4.4 Outbox Pattern

The Outbox Pattern was selected to:

```txt
decouple API response time from HCM latency
support retries
protect HCM from traffic spikes
support asynchronous workflows
avoid distributed transaction complexity
```

Instead of:

```txt
API → directly calling HCM synchronously
```

the system performs:

```txt
API → DB write → Outbox job → Worker → HCM
```

---

## 4.5 Server-Sent Events (SSE)

SSE was selected because:

```txt
frontend only requires server-to-client updates
simpler than WebSockets
lower infrastructure complexity
native browser support
suitable for workflow status streaming
```

---

# 5. Alternatives Considered

## 5.1 Synchronous HCM Calls vs Asynchronous Outbox

Option considered:

```txt
API receives request
→ API calls HCM immediately
→ API returns final status
```

Tradeoff:

```txt
simple control flow
but API latency depends on HCM latency
and traffic spikes directly hit HCM
```

Decision:

```txt
use an outbox-backed asynchronous workflow
```

Reason:

```txt
fast API response
retry support
HCM traffic protection
clear failure recovery path
```

---

## 5.2 Local Balance as Source of Truth vs HCM as Source of Truth

Option considered:

```txt
trust ExampleHR local balance cache for approval
```

Tradeoff:

```txt
fast reads and simple approvals
but unsafe when HCM changes independently
```

Decision:

```txt
HCM remains source of truth
local balance is only a cached read model
```

Reason:

```txt
work anniversary grants
yearly refreshes
external HCM changes
invalid dimension combinations
```

---

## 5.3 Polling vs Server-Sent Events

Option considered:

```txt
frontend polls GET /time-off-requests/:id
```

Tradeoff:

```txt
simple infrastructure
but extra request load and slower perceived feedback
```

Decision:

```txt
SSE for primary realtime updates
polling as fallback
```

Reason:

```txt
request status changes are server-to-client only
SSE is lighter than WebSockets for this workflow
```

---

## 5.4 REST vs GraphQL

Option considered:

```txt
GraphQL schema for employees, balances, and requests
```

Tradeoff:

```txt
flexible client queries
but more setup and less value for command-oriented workflows
```

Decision:

```txt
REST endpoints
```

Reason:

```txt
clear workflow commands
simple testing
easy operational observability
```

---

## 5.5 SQLite vs Production Database

SQLite is used because it is required for the assessment and keeps local setup simple.

Production alternative:

```txt
PostgreSQL with row-level locks or advisory locks
```

Reason:

```txt
stronger concurrency guarantees
better horizontal scaling
better operational tooling
```

---

# 6. Source of Truth Strategy

```txt
HCM = official leave balance source of truth
Local DB = workflow source of truth
Local balances = cached read model
```

The local balance cache improves read performance while still respecting HCM authority.

---

# 7. Core Components

## 7.1 Employees Module

Responsibilities:

```txt
employee retrieval
manager relationship lookup
balance lookup
```

---

## 7.2 Time-Off Requests Module

Responsibilities:

```txt
request creation
request querying
approval workflow
rejection workflow
status management
SSE endpoint exposure
```

---

## 7.3 Outbox Module

Responsibilities:

```txt
outbox job creation
retry handling
dead-letter handling
async workflow execution
```

---

## 7.4 Mock HCM Module

Responsibilities:

```txt
balance validation
leave deduction
idempotent deduction protection
mock external integration simulation
```

---

## 7.5 HCM Sync Module

Responsibilities:

```txt
batch reconciliation
balance refresh
local cache synchronization
```

---

## 7.6 Audit Module

Responsibilities:

```txt
workflow auditing
status transition history
traceability
operational investigation support
```

---

# 8. Request Lifecycle

## 8.1 Request Creation

```txt
Employee submits leave request
→ request stored as VALIDATION_PENDING
→ outbox job created
→ API returns immediately
→ worker validates against HCM
→ request becomes:
   PENDING
   or
   REJECTED
```

---

## 8.2 Approval Workflow

```txt
Manager approves request
→ request becomes HCM_SYNC_PENDING
→ outbox job created
→ worker deducts leave from HCM
→ request becomes:
   APPROVED
   or
   HCM_SYNC_FAILED
```

---

# 9. Request Statuses

## 9.1 Success States

```txt
VALIDATION_PENDING
PENDING
HCM_SYNC_PENDING
APPROVED
```

---

## 9.2 Failure States

```txt
REJECTED
HCM_VALIDATION_FAILED
HCM_SYNC_FAILED
CANCELLED
```

---

# 10. Outbox Workflow

## 10.1 Outbox Job States

```txt
PENDING
PROCESSING
FAILED
DEAD_LETTER
COMPLETED
```

---

## 10.2 Retry Strategy

Retries are supported for transient failures.

Current retry behavior:

```txt
maximum retries = 3
incremental retry delay
dead-letter after retry exhaustion
```

---

# 11. Idempotency Strategy

Each request generates a unique:

```txt
idempotency key
```

The same key is reused during retries.

This prevents:

```txt
duplicate HCM deductions
duplicate approval processing
duplicate retry side-effects
```

Protected scenarios:

```txt
network retry
worker restart
timeout retry
duplicate button click
duplicate API retry
```

---

# 12. Realtime Frontend Updates

The system uses:

```txt
Server-Sent Events (SSE)
```

Endpoint:

```http
GET /time-off-requests/:id/events
```

Frontend flow:

```txt
request created
→ requestId returned
→ frontend opens SSE stream
→ worker updates request
→ backend emits event
→ frontend receives realtime update
```

---

# 13. API Gateway Responsibilities

Frontend communicates through the API Gateway.

Gateway responsibilities:

```txt
TLS termination
authentication
routing
rate limiting
connection management
request forwarding
```

The API Gateway does not generate business events.

---

# 14. Database Design

Core entities:

```txt
Employee
LeaveBalance
TimeOffRequest
OutboxJob
AuditLog
HcmSyncLog
HcmMockBalance
HcmProcessedRequest
```

---

# 15. Repository Pattern

The application uses:

```txt
TypeORM repositories
```

Benefits:

```txt
clean separation of concerns
database abstraction
improved testing
maintainability
scalability
```

---

# 16. Dependency Injection

The application uses:

```txt
NestJS Dependency Injection (DI)
```

Benefits:

```txt
loose coupling
better modularity
testability
clean architecture
```

---

# 17. Security Considerations

## 17.1 API Gateway Layer

```txt
JWT validation
TLS termination
request throttling
routing
```

---

## 17.2 Microservice Layer

```txt
manager authorization
workflow validation
idempotency validation
audit logging
```

---

# 18. Scalability Considerations

The architecture avoids direct synchronous HCM dependency.

Instead:

```txt
API stores requests quickly
→ worker processes asynchronously
→ HCM protected from overload
```

This supports:

```txt
high request concurrency
traffic bursts
retry workflows
eventual consistency
```

In production, the database-backed outbox can be replaced with:

```txt
RabbitMQ
Kafka
AWS SQS
Azure Service Bus
```

---

# 19. Testing Strategy

The project uses production-style E2E testing structure.

```txt
test/
│
├── e2e/
│   ├── employees/
│   ├── time-off-requests/
│   ├── mock-hcm/
│   ├── hcm-sync/
│   └── audit/
│
├── setup/
```

---

# 20. Test Coverage

Covered scenarios:

```txt
employee retrieval
balance retrieval
request creation
validation success
validation failure
manager approval
manager rejection
duplicate approval prevention
HCM deduction
batch sync
audit logs
idempotency
SSE events
defensive HCM validation failure
defensive HCM deduction failure
```

---

# 21. Production Improvements

Potential future improvements:

```txt
PostgreSQL migration
distributed event bus
Kafka/RabbitMQ integration
OpenTelemetry tracing
Prometheus metrics
distributed locking
CQRS separation
Docker/Kubernetes deployment
horizontal worker scaling
```

---

# 22. Conclusion

The Time-Off Microservice demonstrates production-oriented backend architecture using modern NestJS patterns, asynchronous workflow orchestration, realtime updates, and resilient integration strategies.

The implementation focuses on:

```txt
clean architecture
maintainability
scalability
fault tolerance
workflow orchestration
production-oriented backend design
```
