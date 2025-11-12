# IriSync Master Development Prompt & Guide

## 🎯 **CRITICAL DIRECTIVE**
This document is the **MASTER REFERENCE** for all IriSync development work. **ZERO DEVIATION** from these guidelines is permitted. All development must follow the exact specifications outlined in this documentation suite.

---

## 📋 **MANDATORY READING ORDER**

Before ANY development work, you MUST read these documents in this exact order:

1. **00-Master-Prompt-Guide.md** (THIS FILE) - Master development guidelines
2. **01-Project-Overview.md** - Project identity and scope
3. **02-Project-Features.md** - Complete feature specifications
4. **03-Implementation-Verification.md** - Real vs mock implementation status
5. **04-Production-Completion-Plan.md** - Detailed Implementation Plan
6. **05-Naming-Conventions-Architecture.md** - Exact naming standards
7. **06-System-Integration-Data-Flow.md** - System architecture and interactions
8. **07-Project-Completion-Requirements.md** - Completion specifications
9. **08-GCP-Migration-Strategy.md** - Migration from existing infrastructure to GCP alternatives
10. **00-Development-Checklist.md** - Verification checklist

---

## 🚨 **ABSOLUTE REQUIREMENTS**

### **1. PRODUCTION-READY CODE ONLY**
```
❌ NEVER USE: Mock data, placeholder values, stub implementations
✅ ALWAYS USE: Real Firestore integration, actual API calls, production schemas
```

### **2. ENVIRONMENT CONFIGURATION**
```
❌ NEVER ACCESS: .env files (you cannot see them)
✅ ALWAYS USE: environment.md for all environment variable references
✅ UPDATE: environment.md when adding new variables or changing old ones
```

### **3. NAMING CONSISTENCY**
```
❌ NEVER DEVIATE: From established naming conventions in document 05
✅ ALWAYS FOLLOW: Exact enum names, interface structures, method signatures
✅ VERIFY: Against existing codebase patterns before creating new code
```

### **4. ZERO REDUNDANCY**
```
❌ NEVER DUPLICATE: Existing functionality or data structures
✅ ALWAYS CHECK: Document 06 for existing system interactions
✅ EXTEND: Existing services rather than creating new ones
```

---

## 📝 **DEVELOPMENT PROMPT TEMPLATE**

When working on IriSync, use this exact prompt structure:

```
TASK: [Specific development task]

REQUIREMENTS:
1. Read IriSync documentation suite (docs/IriSync-Rewrite/00-07)
2. Follow exact naming conventions from document 05
3. Use production-ready code only (no mocks/placeholders)
4. Reference environment.md for all environment variables
5. Check document 06 for existing system interactions
6. Verify against document 03 for implementation status
7. Follow completion requirements from document 07

CONSTRAINTS:
- ZERO deviation from established patterns
- NO mock data or placeholder implementations
- NO redundant functionality
- MUST use existing services and schemas
- MUST update environment.md if adding new variables

VERIFICATION:
- [ ] Code follows exact naming conventions
- [ ] No mock/placeholder data used
- [ ] Integrates with existing systems properly
- [ ] Environment variables documented in environment.md
- [ ] No duplicate functionality created
- [ ] Production-ready and deployable
```

---

## 🔧 **CRITICAL IMPLEMENTATION GUIDELINES**

### **Token System Implementation**
```typescript
// ✅ CORRECT: Use actual token schema
interface TokenBalance {
  userId: string;
  organizationId?: string;
  includedTokens: number;      // Base tokens (resets on billing cycle)
  purchasedTokens: number;     // Additional tokens (carries over)
  totalUsedTokens: number;     // Combined usage counter
  // ... rest of actual schema
}

// ❌ WRONG: Mock or simplified schema
interface TokenBalance {
  tokens: number; // Too simple, missing required fields
}
```

### **Database Integration**
```typescript
// ✅ CORRECT: Real Firestore integration
const tokenBalance = await db.collection('token_balances')
  .where('userId', '==', userId)
  .get();

// ❌ WRONG: Mock data
const tokenBalance = { tokens: 1000 }; // Placeholder
```

### **Environment Variables**
```typescript
// ✅ CORRECT: Reference environment.md
const openaiKey = process.env.OPENAI_API_KEY; // Documented in environment.md

// ❌ WRONG: Hardcoded or undocumented
const openaiKey = "sk-..."; // Never hardcode
```

---

## 📊 **QUALITY ASSURANCE CHECKLIST**

Before submitting ANY code, verify:

### **Code Quality**
- [ ] Follows TypeScript best practices
- [ ] Includes proper error handling
- [ ] Has appropriate logging
- [ ] Uses existing utility functions
- [ ] Follows established file structure

### **Integration Compliance**
- [ ] Uses correct Firestore collections
- [ ] Follows established API patterns
- [ ] Integrates with existing auth system
- [ ] Uses proper token consumption logic
- [ ] Follows platform connection patterns

### **Documentation Compliance**
- [ ] Naming matches document 05 exactly
- [ ] System interactions follow document 06
- [ ] Implementation status verified against document 03
- [ ] Completion requirements from document 07 addressed

---

## 🎯 **SUCCESS CRITERIA**

Code is considered acceptable ONLY when:

1. **✅ ZERO MOCK DATA** - All data comes from real sources
2. **✅ PRODUCTION READY** - Can be deployed immediately
3. **✅ NAMING COMPLIANT** - Follows exact conventions
4. **✅ INTEGRATION VERIFIED** - Works with existing systems
5. **✅ DOCUMENTATION UPDATED** - environment.md reflects changes
6. **✅ NO REDUNDANCY** - Extends existing functionality

---

## 🚨 **FAILURE CONDITIONS**

Code will be REJECTED if:

- ❌ Contains any mock or placeholder data
- ❌ Deviates from established naming conventions
- ❌ Creates redundant functionality
- ❌ Uses hardcoded values instead of environment variables
- ❌ Ignores existing system architecture
- ❌ Fails to update environment.md when needed

---

## 📞 **ESCALATION PROTOCOL**

If you encounter:
- **Unclear requirements** → Reference document 07
- **Naming conflicts** → Follow document 05 exactly
- **System integration questions** → Check document 06
- **Implementation status uncertainty** → Verify against document 03

**NEVER GUESS OR ASSUME** - Always reference the documentation suite.

---

## 🔄 **MAINTENANCE PROTOCOL**

This documentation suite must be:
- **Updated immediately** when system changes occur
- **Verified for accuracy** before each major development cycle
- **Referenced consistently** by all development team members
- **Treated as the single source of truth** for all decisions

---

**Remember: Consistency is not just preferred—it's MANDATORY for IriSync success.** 