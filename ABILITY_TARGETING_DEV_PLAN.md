# Ability Targeting System - Development Plan

## 📋 Project Overview

Implement a comprehensive ability targeting system that allows units to target other friendly units with abilities, apply effects, and track those effects across game phases with proper duration management.

## 🎯 Core Features

### Primary Features
- **Unit Targeting**: Select target units based on keywords, range, and criteria
- **Effect Application**: Apply stat modifications and other effects to target units
- **Phase-Based Display**: Effects only show during relevant phases
- **Duration Management**: Automatic effect removal based on duration type
- **Visual Feedback**: Unit highlighting and effect symbols with tooltips

### Secondary Features
- **Effect Stacking**: Multiple effects of same type are additive
- **Effect History**: Track applied effects for debugging
- **Backward Compatibility**: Existing abilities continue to work

## 🏗️ System Architecture

### Data Structure

#### Enhanced Ability JSON Structure
```json
{
  "name": "Predatory Strike",
  "description": "The Saurus Oldblood can inspire nearby warriors to charge with greater ferocity.",
  "timing": "Hero Phase",
  "targeting": {
    "type": "friendly_unit",
    "range": "12\"",
    "targeting_criteria": {
      "keywords": ["SERAPHON", "SAURUS"],
      "exclude_self": true,
      "max_targets": 1
    }
  },
  "effects": [
    {
      "type": "modify_stat",
      "stat": "charge_roll",
      "modifier": "+1",
      "duration": "until_end_of_turn",
      "active_phases": ["charge_phase"],
      "symbol": "⚡",
      "description": "+1 to charge rolls"
    }
  ]
}
```

#### Effect Tracking Structure
```javascript
class AbilityEffect {
  constructor(ability, target, caster, duration, activePhases) {
    this.id = generateUniqueId();
    this.ability = ability;
    this.target = target;
    this.caster = caster;
    this.duration = duration;
    this.activePhases = activePhases;
    this.appliedAt = {
      turn: gameState.currentTurn,
      phase: gameState.currentPhase,
      round: gameState.currentRound
    };
    this.isActive = true;
  }
}
```

### Game State Extensions
```javascript
gameState.activeEffects = []; // All currently active effects
gameState.effectHistory = []; // Historical effects for debugging
gameState.effectSymbols = {
  "charge_roll": "⚡",
  "save": "🛡️",
  "move": "🏃",
  "wound": "💪",
  "attack": "⚔️"
};
```

## 📅 Development Phases

### Phase 1: Foundation & Data Structure (Week 1)
**Priority: High**

#### Tasks:
1. **Update JSON Data Structure**
   - Add targeting data to existing abilities
   - Create example abilities with targeting
   - Maintain backward compatibility

2. **Create Core Classes**
   - `AbilityEffect` class for effect tracking
   - `TargetingSystem` class for target validation
   - `EffectManager` class for effect lifecycle

3. **Extend Game State**
   - Add `activeEffects` array
   - Add `effectHistory` array
   - Add effect symbol mapping

#### Deliverables:
- Updated JSON files with targeting data
- Core JavaScript classes
- Basic effect tracking system

#### Acceptance Criteria:
- Abilities can be defined with targeting criteria
- Effects can be created and stored
- Basic effect lifecycle (create, track, remove)

### Phase 2: Targeting UI (Week 2)
**Priority: High**

#### Tasks:
1. **Target Selection Modal**
   - Create modal for target selection
   - Display available units with range indicators
   - Show targeting criteria and restrictions
   - Implement target validation

2. **Unit Highlighting System**
   - Highlight valid targets during selection
   - Visual feedback for selected targets
   - Range-based highlighting

3. **Integration with Ability System**
   - Connect targeting to existing ability buttons
   - Handle ability activation flow
   - Error handling for invalid targets

#### Deliverables:
- Target selection modal
- Unit highlighting system
- Integration with existing ability system

#### Acceptance Criteria:
- Can select target units for abilities
- Visual feedback during targeting
- Proper validation of targeting criteria
- Seamless integration with existing UI

### Phase 3: Effect Display & Management (Week 3)
**Priority: High**

#### Tasks:
1. **Effect Visual System**
   - Unit highlighting for affected units
   - Effect symbols on unit cards
   - Hover tooltips with effect details

2. **Phase-Based Effect Display**
   - Effects only show during active phases
   - Smooth transitions between phases
   - Effect activation/deactivation

3. **Duration Management**
   - Automatic effect removal
   - Turn/round/phase boundary handling
   - Effect cleanup system

#### Deliverables:
- Visual effect system
- Phase-based effect display
- Duration management system

#### Acceptance Criteria:
- Effects are visually represented on units
- Effects appear/disappear based on phases
- Effects are automatically removed based on duration
- Tooltips show effect details

### Phase 4: Advanced Features & Polish (Week 4)
**Priority: Medium**

#### Tasks:
1. **Effect Stacking**
   - Handle multiple effects of same type
   - Visual representation of stacked effects
   - Additive effect calculations

2. **Error Handling & Edge Cases**
   - Unit destroyed while under effect
   - Invalid targeting scenarios
   - Effect conflicts and resolution

3. **Performance Optimization**
   - Efficient effect lookup
   - Minimal DOM updates
   - Memory management

#### Deliverables:
- Effect stacking system
- Comprehensive error handling
- Performance optimizations

#### Acceptance Criteria:
- Multiple effects stack properly
- Robust error handling
- Good performance with many effects
- Clean code and documentation

## 🛠️ Technical Implementation

### File Structure
```
units.js
├── AbilityEffect class
├── TargetingSystem class
├── EffectManager class
├── Target selection functions
├── Effect display functions
└── Duration management functions

units.css
├── Target selection modal styles
├── Unit highlighting styles
├── Effect symbol styles
└── Tooltip styles

units.html
├── Target selection modal HTML
└── Effect tooltip containers

data/*.json
├── Enhanced ability definitions
└── Targeting criteria data
```

### Key Functions

#### Targeting System
```javascript
function getValidTargets(ability, caster) {
  // Return array of valid target units
}

function showTargetSelection(ability, caster) {
  // Display target selection modal
}

function applyAbilityToTarget(ability, target, caster) {
  // Apply ability effects to target
}
```

#### Effect Management
```javascript
function addEffect(effect) {
  // Add effect to active effects
}

function removeEffect(effectId) {
  // Remove effect by ID
}

function updateEffectDisplay() {
  // Update visual representation of effects
}

function cleanupExpiredEffects() {
  // Remove effects that have expired
}
```

#### Phase Management
```javascript
function onPhaseChange() {
  // Handle effect visibility on phase change
}

function onTurnEnd() {
  // Clean up turn-based effects
}

function onRoundEnd() {
  // Clean up round-based effects
}
```

## 🎨 UI/UX Design

### Target Selection Modal
- **Layout**: Grid of available units
- **Range Display**: Text-based range indicators
- **Targeting Info**: Show criteria and restrictions
- **Actions**: Confirm/Cancel buttons

### Effect Display
- **Unit Highlighting**: Subtle background color change
- **Effect Symbols**: Small icons (⚡, 🛡️, 🏃, etc.)
- **Tooltips**: Hover for effect details
- **Stacking**: Multiple symbols for multiple effects

### Visual States
- **Valid Target**: Blue highlight
- **Selected Target**: Green highlight
- **Affected Unit**: Subtle background tint
- **Active Effect**: Symbol with tooltip

## 🧪 Testing Strategy

### Unit Tests
- Effect creation and management
- Targeting validation
- Duration calculations
- Phase transitions

### Integration Tests
- Full ability activation flow
- Effect display and removal
- Multiple effects on same unit
- Turn/round boundaries

### User Acceptance Tests
- Target selection workflow
- Effect visibility during phases
- Tooltip information accuracy
- Performance with many effects

## 📊 Success Metrics

### Functional Metrics
- All abilities with targeting work correctly
- Effects display in correct phases
- Effects are removed at correct times
- No memory leaks or performance issues

### User Experience Metrics
- Intuitive target selection
- Clear visual feedback
- Responsive interactions
- Consistent behavior

## 🚀 Future Enhancements

### Phase 2 Features (Future)
- Enemy unit targeting
- Area of effect abilities
- Conditional effects
- Effect counters

### Advanced Features (Future)
- Effect templates
- Custom effect creation
- Effect import/export
- Advanced targeting options

## 📝 Documentation Requirements

### Code Documentation
- JSDoc comments for all functions
- Class documentation
- API documentation
- Code examples

### User Documentation
- Ability targeting guide
- Effect system explanation
- Troubleshooting guide
- FAQ section

## 🔧 Development Tools

### Required Tools
- Browser developer tools
- JSON validation
- CSS debugging tools
- Performance profiling

### Recommended Tools
- Code formatter (Prettier)
- Linter (ESLint)
- Version control (Git)
- Testing framework (Jest)

## 📋 Risk Assessment

### High Risk
- **Performance Impact**: Many effects could slow down the UI
- **Complexity**: System adds significant complexity to codebase
- **Data Migration**: Existing abilities need to be updated

### Medium Risk
- **UI Clutter**: Too many effect symbols could clutter the interface
- **User Confusion**: Complex targeting might confuse users
- **Browser Compatibility**: Advanced CSS features might not work everywhere

### Low Risk
- **Data Loss**: Effects are not persistent, so no data loss risk
- **Security**: No external data or user input security concerns

## 🎯 Definition of Done

### Phase 1 Complete When:
- [ ] JSON structure updated with targeting data
- [ ] Core classes implemented and tested
- [ ] Basic effect tracking working
- [ ] Code reviewed and documented

### Phase 2 Complete When:
- [ ] Target selection modal functional
- [ ] Unit highlighting working
- [ ] Integration with existing system complete
- [ ] User testing completed

### Phase 3 Complete When:
- [ ] Effect display system working
- [ ] Phase-based visibility implemented
- [ ] Duration management functional
- [ ] Visual polish complete

### Phase 4 Complete When:
- [ ] Effect stacking implemented
- [ ] Error handling comprehensive
- [ ] Performance optimized
- [ ] Full system tested and documented

## 📞 Support & Maintenance

### Ongoing Maintenance
- Monitor performance with many effects
- Update effect symbols as needed
- Handle edge cases as they arise
- User feedback integration

### Support Procedures
- Debug effect display issues
- Help with targeting problems
- Performance troubleshooting
- User training and documentation

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Next Review**: After Phase 1 completion
