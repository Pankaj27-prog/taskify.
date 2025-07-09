# Logic_Document

## Smart Assign Implementation

**Smart Assign** is a feature designed to automatically distribute tasks among users in a fair and balanced way. The main goal is to ensure that no single user is overloaded with too many tasks, while others have fewer or none.

When a user clicks the "Smart Assign" button on a task, the system performs the following steps:

1. **Count Active Tasks:**  
   The system first looks at all the tasks that are not yet marked as "Done." It counts how many active (incomplete) tasks are currently assigned to each user.

2. **Find the Least Busy User:**  
   After counting, the system identifies the user who has the fewest active tasks. This is the person who is currently the least busy.

3. **Assign the Task:**  
   The task is then automatically assigned to this least busy user. This helps distribute the workload evenly across the team.

4. **Feedback:**  
   The user is notified (usually with a toast message) that the task has been smartly assigned.

**Example:**  
Suppose there are three users: Alice, Bob, and Carol.  
- Alice has 3 active tasks.  
- Bob has 1 active task.  
- Carol has 2 active tasks.  

If you use Smart Assign on a new task, the system will assign it to Bob, since he has the fewest active tasks.

---

## Conflict Handling Logic

**Conflict handling** is crucial in collaborative environments where multiple users might try to edit the same task at the same time. Our system uses a versioning approach to detect and resolve such conflicts.

### How It Works:

1. **Version Tracking:**  
   Every task has a version number. Whenever a user edits a task, the version number is sent along with the update.

2. **Detecting a Conflict:**  
   If two users load the same task and both try to make changes:
   - User A saves their changes first. The server updates the task and increments the version.
   - User B, who still has the old version, tries to save their changes. The server sees that User B’s version is outdated (lower than the current version).

3. **Conflict Response:**  
   When the server detects this, it does not overwrite the newer changes. Instead, it responds with a conflict error, providing both the current version of the task and the conflicting changes.

4. **User Resolution:**  
   The user is shown a conflict resolution modal, where they can see both versions (theirs and the server’s). They can choose to:
   - **Merge:** Combine the changes as appropriate.
   - **Overwrite:** Force their changes to replace the server’s version.

5. **Final Update:**  
   Once the user resolves the conflict, the chosen version is saved, and the version number is incremented.

**Example:**  
- Alice and Bob both open “Task X” (version 1).
- Alice changes the description and saves. Task X is now version 2.
- Bob changes the priority and tries to save. The server sees Bob’s version is 1, but the current is 2.
- The system shows Bob a conflict modal, displaying both versions.
- Bob decides to merge his priority change with Alice’s description change, and saves. Task X is now version 3.

---

**In summary:**  
Smart Assign ensures fair task distribution, while conflict handling protects against accidental overwrites and helps users resolve editing clashes smoothly. 