---
name: flow-motion-engine
description: Implements a high-performance infinite canvas in Vanilla JS with pinch-to-zoom, panning, touch support, and scalable elements.
---

# Flow Motion Engine (Infinite Canvas)

This skill provides the core logic for building an infinite canvas (like Miro or Figma) in pure Vanilla JavaScript, supporting both mouse and touch interfaces.

## Core CSS Structure
Requires a fixed viewport and a transformed canvas.
```css
#viewport {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
    touch-action: none; /* Prevents native mobile scrolling */
}
#canvas {
    position: absolute;
    top: 0; left: 0;
    transform-origin: 0 0;
    will-change: transform; /* Hardware acceleration */
}
```

## State & Update Loop
```javascript
let scale = 1;
let translateX = window.innerWidth / 2;
let translateY = window.innerHeight / 2;

function updateCanvas() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}
```

## Mouse Interaction (Pan & Zoom)
```javascript
let isDraggingBoard = false;
let startX, startY;

viewport.addEventListener('mousedown', (e) => {
    // Ignore if clicking on UI or draggable cards
    if (e.target.closest('.card')) return; 
    isDraggingBoard = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingBoard) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateCanvas();
});

window.addEventListener('mouseup', () => isDraggingBoard = false);

viewport.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    const zoomSensitivity = 0.0015;
    const delta = -e.deltaY * zoomSensitivity;
    
    // Zoom towards mouse cursor
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const canvasX = (mouseX - translateX) / scale;
    const canvasY = (mouseY - translateY) / scale;
    
    scale = Math.max(0.1, Math.min(scale * Math.exp(delta), 5));
    
    translateX = mouseX - canvasX * scale;
    translateY = mouseY - canvasY * scale;
    updateCanvas();
}, { passive: false });
```

## Touch Interaction (Pinch & Pan)
Use `touchstart`, `touchmove`, and `touchend`. Track `e.touches.length`.
For 2 fingers (Pinch): Calculate `Math.hypot` distance between touches to determine new scale relative to initial scale.
For 1 finger (Pan): Standard translation math similar to mouse dragging. Always call `e.preventDefault()` on `touchmove` for multiple fingers to block native zoom.
