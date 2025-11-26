# YouTube View Filter + UI

A customizable UserScript (for Violentmonkey/Tampermonkey) that cleans up your YouTube feed by hiding videos with low view counts or "Members Only" restrictions. It includes a floating UI panel for easy configuration.

## Features

*   **Minimum View Threshold**: Automatically hides videos that don't meet your specified view count (e.g., hide everything under 100k views).
*   **Members-Only Filter**: Detects and hides exclusive content badges (supports multiple languages like "Members only", "Csak tagoknak", etc.).
*   **Built-in UI**: A drag-and-drop control panel to adjust settings on the fly without editing code.
*   **Quick Access**: Adds a gear icon (⚙️) to the YouTube masthead.
*   **Stats Tracking**: Shows how many videos were hidden due to low views vs. membership restrictions, plus a lifetime counter.
*   **SponsorBlock Safe**: Version 3.3+ resolves conflicts where SponsorBlock segments were incorrectly hidden.

## Installation

1.  Install a UserScript manager extension for your browser, such as **Violentmonkey** (recommended) or **Tampermonkey**.
2.  Create a new script in your manager.
3.  Copy the JavaScript code into the editor.
4.  Save and enable the script.

## Usage

1.  **Open YouTube**: The script runs automatically on `youtube.com` and `m.youtube.com`.
2.  **Open Settings**: Look for the **⚙️ (Gear)** icon in the top-right header (next to the notification bell/create button).
3.  **Adjust Threshold**:
    *   Use the slider in the panel to set your minimum view requirement (from 1,000 to 1,000,000 views).
    *   Videos below this number will be hidden immediately.
4.  **Toggle**: Use the "Enable Filtering" checkbox to turn the script on or off.
5.  **Stats**: The panel displays how many items have been hidden on the current page.

## Configuration

The script saves your preferences to your browser's `localStorage`, so your threshold and toggle state persist across sessions.

*   **Enabled**: `true` / `false`
*   **Threshold**: Number (default `100,000`)
*   **Lifetime Stats**: Total count of hidden videos.

## License

This project is open source. Feel free to modify and distribute.
