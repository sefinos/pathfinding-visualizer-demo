# Pathfinding Visualizer — Embeddable Widget

An interactive pathfinding-algorithm visualizer for course pages, blog posts, and
lecture slides. Draw walls, drop a start/end node, and watch BFS, DFS, Dijkstra, or
A* explore the grid step by step. One script tag, zero dependencies, zero build step.

---

## Quick start

Add a marker `<div>` with the `data-pathfinding-visualizer` attribute anywhere on your
page, then load the script. That's it — it finds the div and mounts itself
automatically.

```html
<div data-pathfinding-visualizer></div>
<script src="pathfinding-visualizer.js"></script>
```

You can embed as many of these as you like on one page — each is fully independent
(separate grid, separate state, separate playback).

---

## Configuring a widget

Every setting is optional and has a sensible default. Set them as `data-*` attributes
on the marker div:

```html
<div data-pathfinding-visualizer
     data-algorithm="astar"
     data-cols="30"
     data-rows="16"
     data-speed="12"
     data-theme="light"></div>
```

| Attribute | Default | What it does |
|---|---|---|
| `data-algorithm` | `bfs` | Which algorithm is active on load. One of: `bfs`, `dfs`, `dijkstra`, `astar`. |
| `data-cols` | `26` | Grid width, in cells (8–60). |
| `data-rows` | `14` | Grid height, in cells (6–30). |
| `data-grid-size` | — | Shorthand that sets both `data-cols` and `data-rows` at once. Individual `data-cols`/`data-rows` override it if both are present. |
| `data-cell-size` | `26` | Maximum cell size in pixels (10–48). The widget shrinks cells automatically to fit narrow containers — this just sets the ceiling. |
| `data-speed` | `16` | Delay between animation steps, in milliseconds (2–200). Lower = faster. |
| `data-theme` | `dark` | `dark` or `light`. |

### Grid controls

Every widget ships with its own toolbar — no extra markup needed:
- **start / end / wall** buttons choose what clicking (or click-and-drag) on the grid
  places. Wall mode also supports drag-to-erase: start a drag on an existing wall
  and it erases instead of drawing.
- **clear walls** removes walls only, keeping the start/end nodes where they are.
- **reset** restores the grid to its default empty state.
- **run** plays the selected algorithm's traversal, then draws the shortest path
  found (if any).
- Each algorithm tab has a small **i** icon — hover or focus it for a one-line
  explanation of how that algorithm behaves.

### Keyboard shortcuts

While hovering a widget, or with a control inside it focused: **Space** or **Enter**
runs the current algorithm, **R** resets, **C** clears walls, and **1**–**4** switch
between BFS / DFS / Dijkstra / A*. Shortcuts are scoped per-widget (like a video
player) — they never fire from elsewhere on the page, so they won't fight with a
buyer's own site.

---

## Mounting from your own JavaScript

For more control (dynamic pages, single-page apps, or driving the widget from your
own buttons), skip the `data-pathfinding-visualizer` marker and mount manually:

```html
<div id="my-widget"></div>
<script src="pathfinding-visualizer.js"></script>
<script>
  const instance = PathfindingVisualizer.init('#my-widget', {
    algorithm: 'dijkstra',
    cols: 20,
    rows: 12,
    speed: 20,
    theme: 'light',
    onComplete: (result) => {
      // result: { found, exploredCount, pathLength }
      console.log(`Explored ${result.exploredCount} nodes, path length ${result.pathLength}`);
    }
  });
</script>
```

`init()` accepts either a CSS selector string or a DOM element as its first argument,
and returns a handle for controlling that specific instance:

```js
instance.run();                 // play the current algorithm
instance.reset();               // clear everything back to defaults
instance.clearWalls();          // remove walls, keep start/end
instance.setAlgorithm('astar'); // switch algorithm ('bfs' | 'dfs' | 'dijkstra' | 'astar')
instance.destroy();             // tear down and remove the widget entirely
```

Calling `init()` again on an element that's already mounted is safe — it just
returns the existing instance instead of creating a second one.

---

## Notes

- **No external requests.** The widget uses a system monospace font stack
  (`JetBrains Mono` if the buyer's page happens to load it, falling back through
  `Fira Code`, `ui-monospace`, `SF Mono`, and `Consolas`) and injects its own scoped
  CSS — nothing is fetched over the network.
- **Responsive.** Cell size recalculates from the container's actual width, so a
  widget dropped into a narrow blog column shrinks its grid to fit rather than
  overflowing.
- **Touch-enabled.** Placing nodes and drag-drawing walls both work on touchscreens,
  not just with a mouse.
- **Multiple instances are fully independent** — different settings, different
  playback state, no shared globals.
- Weighted cells, a maze generator, and manual step/pause controls aren't in this
  version — see the changelog if a future update adds them.

---

## License

See `LICENSE.txt`. Personal-use only for this version — see that file for details.