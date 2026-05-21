BUILD-READY: 610deb7

## Changes

### Feat: Redesign ShareButton for non-technical users

**Commit:** 610deb7
**Files:**
- src/components/map-controls/ShareButton.vue (complete rewrite)

Complete UX redesign of the share popover modeled on YouTube, Spotify, Canva,
and Google Maps share patterns. Two-tab layout replaces the old single-panel:

**Tab 1: Share Link (default)**
- Clean URL in a styled read-only display box
- Large "Copy Link" CTA button with clipboard copy + checkmark feedback
- Social share row: email (mailto) and WhatsApp share links

**Tab 2: Add to Your Website**
- Friendly plain-English description (never uses the word "iframe")
- Small / Medium / Large size-preset pills (400/600/800px height)
- Styled code box that updates live when preset changes
- "Copy Code" button with same Copied! feedback

**UX polish:**
- Pop-in animation on open
- Header with "Share" title and X close button
- Box-with-arrow-up share icon (iOS/Material standard)
- Full dark/light theme via useShadowStyles
- Mobile-responsive: wider popover below button

**Build verified:** both doxa-research-map.js and doxa-simple-map.js compile.

## Test plan
- Click share icon -- popover opens with "Share Link" tab active
- Tab switching: click "Add to Your Website" -- tab content changes smoothly
- Copy Link: click button -- clipboard gets URL, button shows checkmark + "Copied!" for 2s
- Email icon: opens mailto: link with map URL in body
- WhatsApp icon: opens wa.me share with map URL
- Switch to embed tab -- size pills default to "Medium"
- Click "Small" pill -- code box updates to height="400"
- Click "Large" pill -- code box updates to height="800"
- Copy Code: click button -- clipboard gets embed snippet, "Copied!" feedback
- Click outside popover -- closes
- Press Escape -- closes
- Re-click share button -- toggles closed
- Toggle dark/light theme -- all popover styles adapt
- Mobile viewport -- popover wider, positioned below button, no overflow
- Paste embed snippet into test HTML -- map renders at chosen size
