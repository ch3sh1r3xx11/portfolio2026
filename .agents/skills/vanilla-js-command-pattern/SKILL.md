---
name: vanilla-js-command-pattern
description: Implements an Undo/Redo history manager in Vanilla JavaScript using the Command Design Pattern.
---

# Vanilla JS Command Pattern (Undo/Redo)

This skill provides a robust, zero-dependency Undo/Redo system for Vanilla JS applications using the Command Pattern.

## 1. History Manager
The core controller that maintains `undoStack` and `redoStack`.

```javascript
class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new action
        this.updateButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        this.updateButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
        this.updateButtons();
    }
    
    updateButtons() { /* update UI opacity/state */ }
}
const historyManager = new HistoryManager();
```

## 2. Command Interface
Every action (move, resize, edit, delete) must be a class with `execute()` and `undo()`. They can be async if updating a remote DB (like Firebase).

```javascript
class MoveCommand {
    constructor(id, startX, startY, endX, endY) {
        this.id = id;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
    }
    async execute() {
        // e.g. updateDoc(..., { x: this.endX, y: this.endY })
    }
    async undo() {
        // e.g. updateDoc(..., { x: this.startX, y: this.startY })
    }
}
```

## 3. Usage
Instead of directly modifying data on user actions, instantiate a command and pass it to the manager:
```javascript
const cmd = new MoveCommand(id, 0, 0, 100, 100);
historyManager.execute(cmd);
```
Bind `historyManager.undo()` to `Ctrl+Z` and UI buttons.
