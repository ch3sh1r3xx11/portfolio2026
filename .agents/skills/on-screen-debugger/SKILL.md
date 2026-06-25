---
name: on-screen-debugger
description: Inject an on-screen debug console into web apps to gather hard evidence when traditional debugging fails or is unavailable.
---

# On-Screen Debugger

Use this skill when you are repeatedly failing to fix a UI or event-driven bug (e.g., mouse events, touch events, UI state changes) and you cannot view the user's browser developer console. 

Instead of guessing, inject a visible, floating debug console directly into the application's DOM so the user can see the logs and send you a screenshot.

## Implementation Steps

1. Inject the following function into the main application file (e.g., `app.js`):
```javascript
window.debugLog = function(msg) {
    let box = document.getElementById('debug-box');
    if(!box) {
        box = document.createElement('div');
        box.id = 'debug-box';
        box.style.cssText = 'position:fixed; top:10px; right:10px; background:rgba(0,0,0,0.85); color:#0f0; padding:10px; z-index:999999; font-family:monospace; font-size:11px; pointer-events:none; width:300px; max-height:400px; overflow-y:auto; border: 1px solid #0f0; border-radius: 4px;';
        document.body.appendChild(box);
    }
    const time = new Date().toISOString().split('T')[1].slice(0, 12);
    box.innerHTML += `<div>[${time}] ${msg}</div>`;
    box.scrollTop = box.scrollHeight;
    console.log("[DEBUG]", msg);
};
```
2. Replace relevant `console.log` calls or add `window.debugLog(...)` to the event listeners causing the issue.
3. Ask the user to reproduce the bug and provide a screenshot of the floating black box.
4. Once the bug is resolved, comment out the `window.debugLog` content to disable the UI element without breaking calls to it.
