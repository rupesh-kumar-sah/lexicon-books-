# Firestore Security Specification

## 1. Data Invariants
- **Users**: A user profile is created upon first sign-in. Users cannot escalate their own roles.
- **Books**: Publicly readable. Only admins can manage the inventory.
- **Reviews**: Linked to a specific book and user. Users can only write reviews as themselves.
- **Orders**: Linked to a user. Users can only view their own orders. Admins can view and update status.
- **Wishlist**: A private sub-collection of users. Users can only see and modify their own wishlist.

## 2. The "Dirty Dozen" Payloads (Denial Expected)

1. **Identity Spoofing**: Attempt to create a user profile with a different `uid` in the path than the auth token.
2. **Privilege Escalation**: A regular user attempting to set `role: 'admin'` during profile creation.
3. **Role Hijacking**: A regular user attempting to update their own `role` field.
4. **Shadow Review**: Creating a review with a `userId` that does not match `request.auth.uid`.
5. **Orphaned Review**: Creating a review for a `bookId` that does not exist.
6. **Order Scraping**: A signed-in user attempting to list ALL orders (missing the `userId` filter).
7. **Cross-User Order View**: Accessing an order that belongs to another `userId`.
8. **Malicious Review**: Injecting a 1MB string into the `comment` field of a review.
9. **Price Poisoning**: Attempting to update a book's `price` as a regular user.
10. **ID Poisoning**: Creating a book with a 1MB string as the document ID.
11. **Wishlist Theft**: Accessing another user's wishlist sub-collection.
12. **Status Forgery**: A user attempting to update their own order status to 'delivered' or 'cancelled'.

## 3. Test Runner (Conceptual)

All payloads above must return `PERMISSION_DENIED` in the Firestore emulator.
Specific validation helpers `isValid[Entity]` will be implemented to enforce types and sizes.
