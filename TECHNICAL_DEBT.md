# Technical Debt Log

This file tracks known technical debt, bugs, and inconsistencies that have been identified but are deferred for later action.

## 1. Incomplete Soft-Delete Logic in Products Module

**Issue ID:** PROD-BUG-002 (Partial Fix)
**Location:** `apps/api/src/products/products.service.ts`
**Date Identified:** 2025-11-19

### Description

The task `PROD-BUG-002` to fix missing soft-delete logic in the products module was marked as complete, but the implementation is partial.

- The `remove()` method correctly sets the `deletedAt` field on the `Product` model.
- However, the `findAll()` and `findOne()` methods **do not** filter results by `deletedAt: null`.

### Impact

This bug causes soft-deleted products to be returned by the API as if they were still active. They will appear in product lists and can be retrieved by their ID, leading to incorrect data being displayed to users and potential issues with other parts of the system that rely on product data.

### Recommended Action

Update the `where` clauses in the `findAll` and `findOne` methods in `products.service.ts` to include `deletedAt: null`. Also, review the logic for checking for existing SKUs during creation to decide on the desired behavior for soft-deleted SKUs.
