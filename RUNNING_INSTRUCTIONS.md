# Age of Sigmar: Spearhead Rules - Running Instructions

## 🚀 Quick Start

This is a **client-side web application** that runs entirely in your browser, but **MUST be served from a web server** due to browser security restrictions.

### ⚠️ **IMPORTANT: Cannot Open Directly**
**DO NOT** double-click `index.html` - this will cause "Error loading factions" because browsers block loading JSON files from local files due to CORS security.

### **Method 1: Live Server (Recommended - Easiest)**
If you have VS Code with Live Server extension:
1. Open VS Code in the project folder
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. The app will open at `http://127.0.0.1:5500` (or similar)

### **Method 2: Python Simple Server (If you have Python)**
```bash
# Navigate to project folder
cd "C:\Users\seanb\Coding projects\Spearhead"

# Python 3
python -m http.server 8000

# Python 2 (if you have it)
python -m SimpleHTTPServer 8000
```
Then open: `http://localhost:8000`

### **Method 3: Node.js Server (If you have Node.js)**
```bash
# Install a simple server globally
npm install -g http-server

# Navigate to project folder
cd "C:\Users\seanb\Coding projects\Spearhead"

# Start server
http-server

# Or with specific port
http-server -p 8080
```
Then open: `http://localhost:8080`

### **Method 4: Quick Python Server (If you have Python installed)**
```bash
# Open Command Prompt or PowerShell
# Navigate to your project folder
cd "C:\Users\seanb\Coding projects\Spearhead"

# Start server (Python 3)
python -m http.server 8000

# Then open your browser to:
# http://localhost:8000
```

## 📁 Project Structure

```
Spearhead/
├── index.html              # Main faction selection page
├── units.html              # Units and game management page
├── test_cards.html         # Development testing page
├── style.css               # Main stylesheet
├── units.css               # Units page specific styles
├── script.js               # Main JavaScript functionality
├── units.js                # Units page JavaScript
├── data/                   # Game data files
│   ├── manifest.json       # Faction list
│   ├── battle_tactics.json # Battle tactic cards
│   ├── stormcast_eternals.json
│   ├── skaven.json
│   ├── seraphon.json
│   └── ossiarch_bonereapers.json
└── images/                 # Unit images
    ├── stormcast_eternals/
    ├── skaven/
    ├── seraphon/
    └── ossiarch_bonereapers/
```

## 🎮 How to Use the Application

### **Step 1: Select Your Faction**
1. Open `index.html`
2. Click on one of the faction cards:
   - **Stormcast Eternals** (Blue theme)
   - **Skaven** (Green theme)
   - **Seraphon** (Turquoise theme)
   - **Ossiarch Bonereapers** (Bone theme)

### **Step 2: Choose Army Options**
1. **Regiment Ability**: Select one ability from the available options
2. **Enhancement**: Choose one artifact of power
3. Click **Continue** when both selections are made

### **Step 3: Play the Game**
1. You'll be taken to the units page (`units.html`)
2. **Start Game**: Click to begin a new game
3. **Select Turn**: Choose who goes first (You or Enemy)
4. **Game Controls**: 
   - View current turn, round, and phase
   - Use "Next Phase" to progress through game phases
   - Manage battle tactic cards
5. **Unit Reference**: View unit stats, weapons, and abilities
6. **Phase Rules**: Reference rules for each game phase

## 🎯 Features

### **Faction Theming**
- Each faction has its own color scheme
- Colors automatically apply to all UI elements
- Visual consistency throughout the application

### **Game Management**
- Turn tracking (Player vs Enemy)
- Round progression (1-4 rounds)
- Phase management (Hero, Movement, Shooting, Charge, Combat, etc.)
- Battle tactic card system with status tracking

### **Unit Reference**
- Detailed unit cards with stats
- Weapon profiles (ranged and melee)
- Unit abilities with tooltips
- Keywords and special rules
- Unit images (where available)

### **Interactive Elements**
- Hover effects on all clickable elements
- Smooth animations and transitions
- Responsive design for different screen sizes
- Modern glass-morphism design

## 🔧 Browser Compatibility

**Recommended Browsers:**
- ✅ **Opera GX** (Primary target)
- ✅ **Chrome** (Latest version)
- ✅ **Firefox** (Latest version)
- ✅ **Edge** (Latest version)
- ✅ **Safari** (Latest version)

**Required Features:**
- CSS Grid support
- CSS Custom Properties (CSS Variables)
- ES6 JavaScript features
- Fetch API support

## 🐛 Troubleshooting

### **"Error loading factions" Message**
- **Most Common Issue**: You opened `index.html` directly instead of through a web server
- **Solution**: Use one of the server methods above (Live Server, Python, or Node.js)
- **Why**: Browsers block loading JSON files from local files due to CORS security

### **Images Not Loading**
- Ensure the `images/` folder structure is intact
- Check that image files exist in their respective faction folders
- Some units may not have images (this is normal)

### **Faction Data Not Loading**
- Check browser console for errors (F12 → Console)
- Ensure all JSON files in `data/` folder are valid
- Verify `manifest.json` contains all faction references
- **Make sure you're accessing via http://localhost:port, not file://**

### **Styling Issues**
- Clear browser cache (Ctrl+F5)
- Check that both `style.css` and `units.css` are loading
- Ensure CSS custom properties are supported

### **JavaScript Errors**
- Open browser console (F12 → Console)
- Check for any error messages
- Ensure all JavaScript files are loading properly

## 📱 Mobile Usage

The application is responsive and works on mobile devices:
- Touch-friendly buttons and interactions
- Responsive grid layouts
- Optimized for both portrait and landscape orientations
- Works on tablets and phones

## 🎨 Customization

### **Adding New Factions**
1. Create a new JSON file in `data/` folder
2. Add faction entry to `manifest.json`
3. Add faction images to `images/` folder
4. Update CSS with new faction color theme

### **Modifying Colors**
Edit the CSS custom properties in `style.css`:
```css
:root {
    --primary-color: #your-color;
    --primary-color-rgb: r, g, b;
    --primary-hover-color: #your-hover-color;
}
```

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all files are present in the correct locations
3. Try refreshing the page (Ctrl+F5)
4. Test in a different browser

## 🎲 Game Rules Reference

This application is designed for **Age of Sigmar: Spearhead** format:
- 4 rounds maximum
- Battle tactic cards (1-12)
- Primary objectives scoring
- Regiment abilities and enhancements
- Simplified unit profiles

For complete rules, refer to the official Games Workshop Spearhead rules.

---

**Enjoy your games of Age of Sigmar: Spearhead!** ⚔️
