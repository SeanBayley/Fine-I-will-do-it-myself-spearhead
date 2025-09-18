document.addEventListener('DOMContentLoaded', () => {
    const unitCardsContainer = document.getElementById('unit-cards-container');
    const factionNameHeader = document.getElementById('faction-name-header');



    // --- UI helper: apply staggered reveal to a NodeList or container+selector ---
    function applyReveal(target, selector, baseDelay = 0, stepMs = 60) {
        let elements;
        if (selector && target && typeof target.querySelectorAll === 'function') {
            elements = target.querySelectorAll(selector);
        } else if (target && typeof target.forEach === 'function') {
            elements = target;
        } else {
            elements = [];
        }
        elements.forEach((el, idx) => {
            el.classList.add('reveal-in');
            el.style.animationDelay = `${baseDelay + idx * stepMs}ms`;
        });
    }

    // --- Function to get URL parameters ---
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Function to apply enhancement effects systematically
    function applyEnhancementEffect(effect, units) {
        const targetUnit = units.find(u => u.name === effect.target.unit);
        if (!targetUnit) {
            console.warn(`Target unit '${effect.target.unit}' not found for enhancement effect`);
            return;
        }

        switch (effect.type) {
            case 'addAbility':
                if (!targetUnit.abilities) {
                    targetUnit.abilities = [];
                }
                // Avoid adding duplicates
                if (!targetUnit.abilities.some(ab => ab.name === effect.ability.name)) {
                    targetUnit.abilities.push(effect.ability);
                    console.log(`Applied ability '${effect.ability.name}' to ${targetUnit.name}`);
                }
                break;

            case 'addWeaponAbility':
                const weapon = targetUnit.meleeWeapons?.find(w => w.name === effect.target.weapon) || 
                              targetUnit.rangedWeapons?.find(w => w.name === effect.target.weapon);
                if (weapon) {
                    if (!weapon.abilities) {
                        weapon.abilities = [];
                    }
                    // Avoid adding duplicates
                    if (!weapon.abilities.some(ab => ab.name === effect.ability.name)) {
                        weapon.abilities.push(effect.ability);
                        console.log(`Applied weapon ability '${effect.ability.name}' to ${targetUnit.name}'s ${weapon.name}`);
                    }
                } else {
                    console.warn(`Weapon '${effect.target.weapon}' not found on ${targetUnit.name}`);
                }
                break;

            case 'modifyWeaponStat':
                const targetWeapon = targetUnit.meleeWeapons?.find(w => w.name === effect.target.weapon) || 
                                   targetUnit.rangedWeapons?.find(w => w.name === effect.target.weapon);
                if (targetWeapon) {
                    if (effect.operation === 'add') {
                        const currentValue = parseInt(targetWeapon[effect.stat]);
                        if (!isNaN(currentValue)) {
                            targetWeapon[effect.stat] = currentValue + effect.value;
                        } else {
                            targetWeapon[effect.stat] = effect.value;
                        }
                    } else {
                        targetWeapon[effect.stat] = effect.value;
                    }
                    console.log(`Modified ${targetUnit.name}'s ${targetWeapon.name} ${effect.stat} to ${targetWeapon[effect.stat]}`);
                } else {
                    console.warn(`Weapon '${effect.target.weapon}' not found on ${targetUnit.name}`);
                }
                break;

            case 'modifyAbility':
                const targetAbility = targetUnit.abilities?.find(ab => ab.name === effect.target.ability);
                if (targetAbility) {
                    Object.assign(targetAbility, effect.modifications);
                    console.log(`Modified ability '${effect.target.ability}' on ${targetUnit.name}`);
                } else {
                    console.warn(`Ability '${effect.target.ability}' not found on ${targetUnit.name}`);
                }
                break;

            case 'modifyKeyword':
                if (targetUnit.keywords) {
                    const keywordIndex = targetUnit.keywords.indexOf(effect.oldKeyword);
                    if (keywordIndex !== -1) {
                        targetUnit.keywords[keywordIndex] = effect.newKeyword;
                        console.log(`Modified keyword '${effect.oldKeyword}' to '${effect.newKeyword}' on ${targetUnit.name}`);
                    } else {
                        console.warn(`Keyword '${effect.oldKeyword}' not found on ${targetUnit.name}`);
                    }
                }
                break;

            default:
                console.warn(`Unknown enhancement effect type: ${effect.type}`);
        }
    }

    // --- NEW Helper function to display a single Unit Card ---
    function displayUnitCard(unit, container) {
        const card = document.createElement('div');
        card.className = 'unit-card';

        // Create unit header with background image
        let headerHTML = '';
        if (unit.imageUrl) {
            // Calculate background position based on backgroundPosition property
            let backgroundPosition = 'center center'; // Default
            if (unit.backgroundPosition !== undefined) {
                // Convert percentage to CSS background-position
                // 100% means top of image aligns with top of card
                // 0% means bottom of image aligns with bottom of card
                backgroundPosition = `center ${unit.backgroundPosition}%`;
            }
            
            headerHTML = `
                <div class="unit-header" style="background-image: url('${escapeHtml(unit.imageUrl)}'); background-position: ${backgroundPosition};">
                    <a href="${escapeHtml(unit.imageUrl)}" target="_blank" class="unit-image-link" title="View full-size image">
                        <div class="unit-header-content">
                            <h3>${unit.name}</h3>
                            <div class="stats-container">
            `;
        } else {
            headerHTML = `
                <div class="unit-header">
                    <div class="unit-header-content">
                        <h3>${unit.name}</h3>
                        <div class="stats-container">
            `;
        }

        // Stats
        if (unit.stats) {
            const headers = Object.keys(unit.stats);
            headers.forEach(header => {
                 headerHTML += `<div class="stat-box"><span class="stat-label">${header.toUpperCase()}</span><span class="stat-value">${unit.stats[header]}</span></div>`;
            });
        }
        
        if (unit.imageUrl) {
            headerHTML += `
                            </div>
                        </div>
                    </a>
                </div>
            `;
        } else {
            headerHTML += `
                        </div>
                    </div>
                </div>
            `;
        }

        let cardHTML = headerHTML + '<div class="unit-content">';

        // Ranged Weapons Table (MODIFIED for Abilities and Collapsible)
        if (unit.rangedWeapons && unit.rangedWeapons.length > 0) {
            cardHTML += '<details class="weapon-section">'; // Wrap in details
            cardHTML += '<summary><h4 class="card-section-header">Ranged Weapons</h4></summary>'; // Use h4 as summary
            // ADDED Abilities Header
            cardHTML += '<table class="weapons-table ranged-weapons-table"><thead><tr><th>Name</th><th>Range</th><th>Attacks</th><th>Hit</th><th>Wound</th><th>Rend</th><th>Damage</th><th>Abilities</th></tr></thead><tbody>';
            unit.rangedWeapons.forEach(w => {
                // ADDED Abilities rendering logic
                let abilitiesHTML = '';
                if (w.abilities && w.abilities.length > 0) {
                    abilitiesHTML = w.abilities.map(ab => {
                        // *** Store data in attributes, remove data-tooltip ***
                        const description = escapeHtml(ab.description || '');
                        const timing = escapeHtml(ab.timing || '');
                        const frequency = escapeHtml(ab.frequency || '');
                        return `<span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ab.name)}</span>`;
                    }).join(', ');
                }
                // ADDED abilities cell
                cardHTML += `<tr><td>${w.name}</td><td>${w.range}</td><td>${w.attacks}</td><td>${w.hit}</td><td>${w.wound}</td><td>${w.rend}</td><td>${w.damage}</td><td>${abilitiesHTML || '-'}</td></tr>`;
            });
            cardHTML += '</tbody></table>';
            cardHTML += '</details>'; // Close details
        }
        
        // Melee Weapons Table (MODIFIED for Collapsible)
        if (unit.meleeWeapons && unit.meleeWeapons.length > 0) {
            cardHTML += '<details class="weapon-section">'; // Wrap in details
            cardHTML += '<summary><h4 class="card-section-header">Melee Weapons</h4></summary>'; // Use h4 as summary
            // CORRECTED THEAD: Removed Range header
            cardHTML += '<table class="weapons-table melee-weapons-table"><thead><tr><th>Name</th><th>Attacks</th><th>Hit</th><th>Wound</th><th>Rend</th><th>Damage</th><th>Abilities</th></tr></thead><tbody>';
            unit.meleeWeapons.forEach(w => {
                let abilitiesHTML = '';
                if (w.abilities && w.abilities.length > 0) {
                    abilitiesHTML = w.abilities.map(ab => {
                         // *** Store data in attributes, remove data-tooltip ***
                        const description = escapeHtml(ab.description || '');
                        const timing = escapeHtml(ab.timing || '');
                        const frequency = escapeHtml(ab.frequency || '');
                        // Ensure escapeHtml is used for name
                        return `<span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ab.name)}</span>`;
                    }).join(', ');
                }
                // Corrected TR: Removed range cell
                cardHTML += `<tr><td>${w.name}</td><td>${w.attacks}</td><td>${w.hit}</td><td>${w.wound}</td><td>${w.rend}</td><td>${w.damage}</td><td>${abilitiesHTML || '-'}</td></tr>`;
            });
            cardHTML += '</tbody></table>';
            cardHTML += '</details>'; // Close details
        }

        // Abilities List
        if (unit.abilities && unit.abilities.length > 0) {
            cardHTML += '<h4 class="card-section-header">Abilities</h4>';
            cardHTML += '<ul class="abilities-list">';
            unit.abilities.forEach(ability => {
                // *** Store data in attributes, remove data-tooltip ***
                const description = escapeHtml(ability.description || '');
                const timing = escapeHtml(ability.timing || '');
                const frequency = escapeHtml(ability.frequency || '');

                // Check if ability has targeting
                if (ability.targeting) {
                    // Check if ability can be used
                    const canUse = canUseAbility(unit.name, ability.name);
                    const usage = gameState.abilityUsage[getAbilityUsageKey(unit.name, ability.name)];
                    const usageText = usage ? ` (${usage.used}/${usage.maxUses})` : '';
                    
                    // Add ability with button
                    cardHTML += `<li class="ability-with-button">
                        <span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ability.name)}${usageText}</span>
                        <button class="ability-activate-btn ${canUse ? '' : 'disabled'}" data-ability-name="${escapeHtml(ability.name)}" data-unit-name="${escapeHtml(unit.name)}" title="Activate ${escapeHtml(ability.name)}" ${canUse ? '' : 'disabled'}>${canUse ? 'Use' : 'Used'}</button>
                    </li>`;
                } else {
                    // Regular ability without targeting
                    cardHTML += `<li><span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ability.name)}</span></li>`;
                }
            });
            cardHTML += '</ul>';
        }

        // Keywords
        if (unit.keywords && unit.keywords.length > 0) {
            cardHTML += '<h4 class="card-section-header">Keywords</h4>';
            // --- MODIFIED Keyword Rendering ---
            const keywordTooltip = "This unit can be replaced when destroyed, see Call for Reinforcements in the movement phase for details";
            const keywordsHTML = unit.keywords.map(keyword => {
                if (keyword.toUpperCase() === 'REINFORCEMENTS') {
                    const escapedKeyword = escapeHtml(keyword);
                    const escapedTooltip = escapeHtml(keywordTooltip);
                    // *** Use new data attributes for JS tooltip ***
                    return `<span class="ability-name" data-description="${escapedTooltip}" data-timing="" data-frequency="">${escapedKeyword}</span>`;
                } else {
                    return escapeHtml(keyword); // Escape other keywords too for safety
                }
            }).join(', '); // Join the processed keywords/spans
            cardHTML += `<p class="keywords-list">${keywordsHTML}</p>`;
            // --- END MODIFIED Keyword Rendering ---
        }

        cardHTML += '</div>'; // Close unit-content div

        card.innerHTML = cardHTML;
        container.appendChild(card);
        
        // Add event listeners for ability buttons
        const abilityButtons = card.querySelectorAll('.ability-activate-btn');
        abilityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                const abilityName = button.dataset.abilityName;
                const unitName = button.dataset.unitName;
                
                // Find the ability and unit
                const ability = unit.abilities.find(a => a.name === abilityName);
                if (ability) {
                    activateAbility(ability, unit);
                }
            });
        });
    }

    // --- Load data based on URL parameter ---
    const factionDataFile = getQueryParam('faction');

    if (factionDataFile) {
        fetch(factionDataFile)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(factionData => {
                console.log('Fetched faction data for units page:', factionData);
                
                // Store faction data in game state for targeting system
                gameState.factionData = factionData;
                
                 // *** ADD FACTION CLASS TO BODY ***
                 document.body.className = ''; // Clear previous classes
                 if (factionData.factionId) {
                     document.body.classList.add(factionData.factionId);
                 }
                 // ********************************

                // Display Faction Name
                if (factionNameHeader && factionData.factionName) {
                     factionNameHeader.textContent = `${factionData.factionName} Units`;
                }
                
                // *** NEW: Apply Enhancement Effects to Units ***
                const selectedEnhancementNameForUnitMod = decodeURIComponent(getQueryParam('enhancement') || '');
                
                if (selectedEnhancementNameForUnitMod && factionData.units && factionData.enhancements) {
                    // Find the selected enhancement
                    const selectedEnhancement = factionData.enhancements.find(enh => enh.name === selectedEnhancementNameForUnitMod);
                    
                    if (selectedEnhancement && selectedEnhancement.effects) {
                        console.log(`Applying enhancement: ${selectedEnhancementNameForUnitMod}`);
                        
                        // Apply each effect from the enhancement
                        selectedEnhancement.effects.forEach(effect => {
                            applyEnhancementEffect(effect, factionData.units);
                        });
                    }
                }
                // ********************************************

                 // Clear container before adding new cards
                unitCardsContainer.innerHTML = ''; 

                // Display Unit Cards (using potentially modified factionData)
                if (factionData.units && factionData.units.length > 0) {
                    factionData.units.forEach(unit => {
                         displayUnitCard(unit, unitCardsContainer);
                    });
                    // Reveal cards after render
                    applyReveal(unitCardsContainer, '.unit-card', 0, 60);
                } else {
                     unitCardsContainer.innerHTML = '<p>No units found for this faction.</p>';
                }

                // Populate Phase Rules (using potentially modified factionData)
                populatePhaseRules(factionData);

                // Reveal phase sections
                const phaseColumn = document.getElementById('phase-rules-column');
                applyReveal(phaseColumn, 'details.phase-section', 150, 80);

            })
            .catch(error => {
                 console.error('Error loading faction data on units page:', error);
                 document.body.className = 'error-loading'; // Optional: class for error state
                 unitCardsContainer.innerHTML = '<p>Error loading unit data.</p>';
                 if (factionNameHeader) factionNameHeader.textContent = 'Error Loading Faction';
             });
    } else {
         console.error('No faction data file specified in URL parameter.');
         document.body.className = 'error-loading'; // Optional: class for error state
         unitCardsContainer.innerHTML = '<p>No faction specified. Please go back and select a faction.</p>';
         if (factionNameHeader) factionNameHeader.textContent = 'No Faction Specified';
     }

    // --- NEW: Function to populate Phase Rules column ---
    function populatePhaseRules(factionData) {
        const phaseColumn = document.getElementById('phase-rules-column');
        const phaseDetailsElements = phaseColumn.querySelectorAll('details.phase-section');
        
        // --- Get selected ability/enhancement from URL ---
        const selectedAbilityName = decodeURIComponent(getQueryParam('ability') || '');
        const selectedEnhancementName = decodeURIComponent(getQueryParam('enhancement') || '');
        console.log('Selected Ability:', selectedAbilityName);
        console.log('Selected Enhancement:', selectedEnhancementName);
        // --------------------------------------------------
        
        const phaseAbilities = {
            hero: [],
            movement: [],
            shooting: [],
            charge: [],
            combat: [],
            'taking-damage': [],
            end: []
        };

         // --- Define Core Phase Rules ---
         const corePhaseRules = {
            hero: [], // No generic core actions typically listed for Hero phase
            movement: [
                { name: "Move", description: "Standard move up to the unit's Move characteristic." },
                { name: "Run", description: "Unit cannot shoot or charge later. Roll a D6 and add the result to the Move characteristic for this phase." }
            ],
            shooting: [
                { name: "Shoot", description: "Units shoot with their ranged weapons if eligible." }
            ],
            charge: [
                { name: "Charge", description: "Roll 2D6. If the result is >= the distance to the target enemy unit, move your unit within 1/2\" of the target." }
            ],
            combat: [
                { name: "Fight", description: "Starting with the active player, players alternate picking eligible units to fight." }
            ],    
            'taking-damage': [
                { name: "Remember Ward Saves", description: "" }
            ],
            end: [
                { name: "Score Objectives", description: "Check conditions for scoring objectives." }
            ]
        };

        // --- Helper to map timing strings to phase keys ---
        function getPhaseKey(timing) {
            if (!timing) return null;
            const lowerTiming = timing.toLowerCase();
            if (lowerTiming.includes('hero phase')) return 'hero';
            if (lowerTiming.includes('movement phase')) return 'movement';
            if (lowerTiming.includes('shooting phase')) return 'shooting';
            if (lowerTiming.includes('charge phase')) return 'charge';
            // Include start/during/end of combat phase and 'any combat phase'
            if (lowerTiming.includes('combat phase')) return 'combat'; 
            if (lowerTiming.includes('end of turn')) return 'end';
            // Ignore 'passive', 'n/a', etc.
            return null;
        }

        // --- Clear previous dynamic content (enhancement, phase lists) ---
        const existingEnhancementDisplay = phaseColumn.querySelector('.selected-enhancement-display');
        if (existingEnhancementDisplay) {
            existingEnhancementDisplay.remove();
        }
        // ----------------------------------------------------------------

        // --- Process Selected Enhancement (Conditional Display) ---
        let enhancementAddedToPhase = false;
        if (selectedEnhancementName && factionData.enhancements) {
            const selectedEnhancement = factionData.enhancements.find(enh => enh.name === selectedEnhancementName);
            if (selectedEnhancement) {
                const phaseKey = getPhaseKey(selectedEnhancement.timing);
                if (phaseKey) {
                    // Add to the specific phase list
                    phaseAbilities[phaseKey].push({
                        name: selectedEnhancement.name,
                        description: selectedEnhancement.description,
                        source: 'Enhancement',
                        timing: selectedEnhancement.timing,
                        frequency: selectedEnhancement.frequency
                    });
                    enhancementAddedToPhase = true; // Mark that it was handled
                } else {
                    // Display separately if timing is passive/other
                    const enhancementDiv = document.createElement('div');
                    enhancementDiv.className = 'selected-enhancement-display';
                    // *** Use data-description instead of data-tooltip ***
                    enhancementDiv.innerHTML = `
                        <h4>Selected Enhancement</h4>
                        <p>
                            <span class="ability-name" data-description="${escapeHtml(selectedEnhancement.description)}" data-timing="" data-frequency="">${escapeHtml(selectedEnhancement.name)}</span>
                        </p>
                    `;
                    phaseColumn.querySelector('h2').insertAdjacentElement('afterend', enhancementDiv);
                }
            }
        }
        // -------------------------------------
        
        // --- NEW: Check for Reinforcements keyword and add core ability ---
        const hasReinforcements = factionData.units?.some(unit => 
            unit.keywords?.some(kw => kw.toUpperCase() === 'REINFORCEMENTS')
        );

        if (hasReinforcements) {
            phaseAbilities.movement.push({
                name: "Call for Reinforcements",
                description: "Declare: Pick a friendly REINFORCEMENTS unit that has been destroyed. Effect: Set up an identical replacement unit on the battlefield, wholly within friendly territory, wholly within 6\" of the battlefield edge and not in combat. Each REINFORCEMENTS unit can only be replaced once. Replacement units cannot themselves be replaced.",
                source: 'Core Rule',
                timing: 'Movement Phase',
                frequency: 'Once per turn per unit' // Clarified frequency
            });
             console.log("Added 'Call for Reinforcements' to Movement phase.");
        }
        // --- END Reinforcements Check ---

        // --- Gather dynamic abilities by phase --- 
        // Army Rules
        if (factionData.armyRules) {
            factionData.armyRules.forEach(rule => {
                const phaseKey = getPhaseKey(rule.timing);
                if (phaseKey) {
                    phaseAbilities[phaseKey].push({ 
                        name: rule.name, 
                        description: rule.description, 
                        source: 'Army Rule', 
                        timing: rule.timing,
                        frequency: rule.frequency
                    });
                }
            });
        }

        // Regiment Abilities (FILTERED)
        if (factionData.regimentAbilities) {
            factionData.regimentAbilities.forEach(ability => {
                 if (ability.name === selectedAbilityName) {
                     const phaseKey = getPhaseKey(ability.timing);
                     if (phaseKey) {
                         phaseAbilities[phaseKey].push({ 
                             name: ability.name, 
                             description: ability.description, 
                             source: 'Regiment Ability', 
                             timing: ability.timing,
                             frequency: ability.frequency
                         });
                     }
                 }
            });
        }

        // Unit & Weapon Abilities 
        if (factionData.units) {
            factionData.units.forEach(unit => {
                // Unit-level abilities
                if (unit.abilities) {
                    unit.abilities.forEach(ability => {
                        const phaseKey = getPhaseKey(ability.timing);
                        if (phaseKey) {
                            phaseAbilities[phaseKey].push({ 
                                name: ability.name, 
                                description: ability.description, 
                                source: unit.name, // Source is the unit name
                                timing: ability.timing,
                                frequency: ability.frequency
                            });
                        }
                    });
                }
                // Ranged Weapon abilities 
                if (unit.rangedWeapons) {
                     unit.rangedWeapons.forEach(weapon => {
                         if (weapon.abilities) {
                             weapon.abilities.forEach(ability => {
                                 const phaseKey = getPhaseKey(ability.timing); 
                                 if (phaseKey) {
                                      phaseAbilities[phaseKey].push({ 
                                          name: ability.name, 
                                          description: ability.description, 
                                          source: `${unit.name} (${weapon.name})`, 
                                          timing: ability.timing,
                                          frequency: ability.frequency
                                      });
                                 }
                             });
                         }
                     });
                }
                // Melee Weapon abilities
                 if (unit.meleeWeapons) {
                     unit.meleeWeapons.forEach(weapon => {
                         if (weapon.abilities) {
                             weapon.abilities.forEach(ability => {
                                 const phaseKey = getPhaseKey(ability.timing); 
                                 if (phaseKey) {
                                      phaseAbilities[phaseKey].push({ 
                                          name: ability.name, 
                                          description: ability.description, 
                                          source: `${unit.name} (${weapon.name})`,
                                          timing: ability.timing,
                                          frequency: ability.frequency
                                      });
                                 }
                             });
                         }
                     });
                 }
            });
        }

        // --- Populate HTML --- 
        phaseDetailsElements.forEach(detailsEl => {
            const phaseKey = detailsEl.dataset.phase;
            const summary = detailsEl.querySelector('summary'); // Keep the summary
            
            // Clear previous content except summary
            while (detailsEl.lastChild !== summary) {
                 if (detailsEl.lastChild) {
                    detailsEl.removeChild(detailsEl.lastChild);
                 } else {
                    break; // Should not happen if summary exists
                 }
            }

            const itemsForPhase = [];

            // Add Core Rules First (if any)
            if (corePhaseRules[phaseKey] && corePhaseRules[phaseKey].length > 0) {
                 corePhaseRules[phaseKey].forEach(coreRule => {
                     itemsForPhase.push({ name: coreRule.name, description: coreRule.description, isCore: true });
                 });
            }

            // Add Dynamic Abilities
            if (phaseAbilities[phaseKey] && phaseAbilities[phaseKey].length > 0) {
                phaseAbilities[phaseKey].forEach(ability => {
                    itemsForPhase.push({ 
                        name: ability.name, 
                        description: ability.description, 
                        source: ability.source, 
                        timing: ability.timing,
                        frequency: ability.frequency,
                        isCore: false 
                    });
                });
            }

            // Build and append the list if there are any items
            if (itemsForPhase.length > 0) {
                const list = document.createElement('ul');
                itemsForPhase.forEach(item => {
                    const listItem = document.createElement('li');
                    if (item.isCore) {
                        // Simple display for core rules
                        listItem.innerHTML = `<strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(item.description)}`;
                    } else {
                        // Tooltip display for dynamic abilities
                        // *** Use data-* attributes for JS tooltip ***
                        const description = escapeHtml(item.description || '');
                        const timing = escapeHtml(item.timing || '');
                        const frequency = escapeHtml(item.frequency || '');
                        const source = escapeHtml(item.source || '');
                        
                        listItem.innerHTML = `
                            <span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(item.name)}</span>
                            <span class="ability-source">(${source})</span>
                        `;
                    }
                    list.appendChild(listItem);
                });
                detailsEl.appendChild(list); // Append the list after the summary
            } else {
                // Add a 'No specific rules...' message if nothing else is present
                const noContentMsg = document.createElement('p');
                noContentMsg.textContent = '(No specific rules or abilities for this phase)';
                // Apply styles similar to list items for consistency
                noContentMsg.style.fontSize = '0.9em'; 
                noContentMsg.style.padding = '0.5em 0.8em';
                noContentMsg.style.margin = '0';
                noContentMsg.style.borderTop = `1px solid var(--primary-color)`;
                noContentMsg.style.color = 'var(--text-color)'; // Ensure text color matches
                detailsEl.appendChild(noContentMsg);
            }
        });

        setupTooltips(); // *** ADD Call setup after populating phases ***
    }

    // --- Helper function to escape HTML for attributes ---
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // --- Accordion functionality for Phase Rules ---
    const phaseSections = document.querySelectorAll('#phase-rules-column details.phase-section');
    
    phaseSections.forEach(section => {
        section.addEventListener('toggle', (event) => {
            // If the section was opened
            if (section.open) {
                // Close all other sections
                phaseSections.forEach(otherSection => {
                    if (otherSection !== section && otherSection.open) {
                        otherSection.open = false;
                    }
                });
            }
        });
    });

    // --- NEW: JavaScript Tooltip Logic --- 
    let tooltipElement = null; // To hold the tooltip div

    function showTooltip(event) {
        const span = event.target;
        const description = span.dataset.description;
        const timing = span.dataset.timing;
        const frequency = span.dataset.frequency; // Get frequency

        if (!description) {
            console.log('Tooltip: No description found for', span);
            return; // Don't show empty tooltip
        }
        console.log('Tooltip Data:', { description, timing, frequency }); // Log retrieved data

        // Create tooltip element if it doesn't exist
        if (!tooltipElement) {
            tooltipElement = document.createElement('div');
            tooltipElement.className = 'js-tooltip';
            document.body.appendChild(tooltipElement);
        }

        // Construct content with potential line break
        let tooltipHTML = '';
        if (timing && timing.toLowerCase() !== 'passive' && timing !== 'N/A') {
            tooltipHTML += `<strong>Timing:</strong> ${timing}<br>`; // Use <br>
        }
        // Add Frequency if available and not N/A
        if (frequency && frequency !== 'N/A') {
            tooltipHTML += `<strong>Frequency:</strong> ${frequency}<br>`; // Use <br>
        }
        tooltipHTML += description; // Already escaped when setting data attribute

        tooltipElement.innerHTML = tooltipHTML;
        tooltipElement.style.display = 'block';
        console.log('Tooltip HTML:', tooltipHTML); // Log the generated HTML
        console.log('Tooltip Element:', tooltipElement); // Log the element itself

        // Position the tooltip (simple example: above the cursor)
        // More sophisticated positioning might be needed depending on context
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        let top = event.clientY + scrollY - tooltipElement.offsetHeight - 10; // 10px offset above cursor
        let left = event.clientX + scrollX - (tooltipElement.offsetWidth / 2); // Center above cursor

        // Basic boundary check (prevent going off left/top)
        if (top < scrollY) top = scrollY + 5;
        if (left < scrollX) left = scrollX + 5;
        // Add check for right edge if needed

        tooltipElement.style.top = `${top}px`;
        tooltipElement.style.left = `${left}px`;
    }

    function hideTooltip() {
        // Add a small delay to prevent immediate hiding if tooltip overlaps span
        setTimeout(() => {
             if (tooltipElement) {
                tooltipElement.style.display = 'none';
            }
        }, 50); // 50ms delay, adjust if needed
    }

    // Use event delegation on a parent container for efficiency
    // We need to wait until cards are potentially rendered, so maybe delegate on body or #units-content
    // Or re-run this setup after fetching/rendering data. Let's re-run after.

    function setupTooltips() {
         // Remove previous listeners if any (to avoid duplicates on re-fetch)
        document.querySelectorAll('.ability-name').forEach(span => {
            span.removeEventListener('mouseover', showTooltip);
            span.removeEventListener('mouseout', hideTooltip);
            span.removeEventListener('mousemove', (e) => {
                 // Optional: Update position on mouse move if tooltip stays open long 
                 // For simplicity, we position on mouseover only for now
            });
        });

        // Add new listeners
        document.querySelectorAll('.ability-name').forEach(span => {
            span.addEventListener('mouseover', showTooltip);
            span.addEventListener('mouseout', hideTooltip);
            // span.addEventListener('mousemove', moveTooltip); // If needed
        });
    }

    // --- NEW: Back Button Navigation --- 
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    } else {
        console.error("Could not find the back button (#back-button) to attach listener.");
    }
    
    // Load battle tactics data
    loadBattleTactics();

    // --- GAME STATE MANAGEMENT ---
    let gameState = {
        isGameActive: false,
        currentRound: 1,
        currentTurn: 'player', // 'player' or 'enemy'
        startingPlayer: null,
        currentPhase: 0, // Index of current phase
        phases: ['hero', 'movement', 'shooting', 'charge', 'combat', 'taking-damage', 'end'],
        phaseNames: ['Hero Phase', 'Movement Phase', 'Shooting Phase', 'Charge Phase', 'Combat Phase', 'Taking Damage', 'End of Turn'],
        roundTurnsCompleted: 0, // Track how many turns have been completed in current round
        // Card system
        allCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        drawnCards: [],
        currentRoundCards: [],
        cardsByRound: {}, // Track which cards were drawn in which round
        usedCards: [], // Track which cards have been used
        keptCards: [], // Track which cards are kept for next round
        scoredCards: [], // Track which cards have been scored
        // New centralized card status storage
        cardStates: {}, // Store each card's status: Pending, Used, Scored, Kept, Discarded
        battleTactics: [], // Will store battle tactics data
        // Scoring system
        scores: {
            rounds: {}, // Store scores for each round
            gameTotal: 0
        },
        // Ability usage tracking
        abilityUsage: {} // Format: "unitName:abilityName" -> { used: number, maxUses: number, resetPeriod: string }
    };

    // --- GAME CONTROLS ---
    const startGameBtn = document.getElementById('start-game-btn');
    const gameSetup = document.getElementById('game-setup');
    const gameInProgress = document.getElementById('game-in-progress');
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    const endGameBtn = document.getElementById('end-game-btn');
    const currentTurnSpan = document.getElementById('current-turn');
    const currentRoundSpan = document.getElementById('current-round');
    const currentPhaseSpan = document.getElementById('current-phase');
    const turnIndicator = document.querySelector('.turn-indicator');
    const currentScoreSpan = document.getElementById('current-score');
    const currentCardsDisplay = document.getElementById('current-cards-display');
    const viewAllCardsBtn = document.getElementById('view-all-cards-btn');
    const allCardsModal = document.getElementById('all-cards-modal');
    const allCardsGrid = document.getElementById('all-cards-grid');
    
    // Track which modal was open before card details modal
    let previousModal = null;
    
    // --- ABILITY TARGETING SYSTEM ---
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
        
        isExpired() {
            const currentTurn = gameState.currentTurn;
            const currentPhase = gameState.currentPhase;
            const currentRound = gameState.currentRound;
            
            switch (this.duration) {
                case 'until_end_of_phase':
                    return currentPhase !== this.appliedAt.phase || 
                           currentTurn !== this.appliedAt.turn ||
                           currentRound !== this.appliedAt.round;
                case 'until_end_of_turn':
                    return currentTurn !== this.appliedAt.turn ||
                           currentRound !== this.appliedAt.round;
                case 'until_end_of_round':
                    return currentRound !== this.appliedAt.round;
                case 'until_start_of_next_phase':
                    // This will be handled by phase change logic
                    return false;
                default:
                    return false;
            }
        }
        
        isActiveInCurrentPhase() {
            if (!this.isActive) return false;
            if (this.isExpired()) return false;
            
            // Safety check for gameState and phaseNames
            if (!gameState || !gameState.phaseNames || gameState.currentPhase === undefined) {
                console.warn('GameState or phaseNames not available');
                return false;
            }
            
            const currentPhaseName = gameState.phaseNames[gameState.currentPhase];
            if (!currentPhaseName) {
                console.warn('Current phase name not found');
                return false;
            }
            
            const currentPhaseLower = currentPhaseName.toLowerCase();
            
            // Map JSON phase names to actual phase names
            const phaseMapping = {
                'hero_phase': 'hero',
                'movement_phase': 'movement', 
                'shooting_phase': 'shooting',
                'charge_phase': 'charge',
                'combat_phase': 'combat',
                'taking_damage': 'taking damage',
                'end_of_turn': 'end of turn'
            };
            
            return this.activePhases.some(phase => {
                if (!phase) return false;
                const mappedPhase = phaseMapping[phase.toLowerCase()] || phase.toLowerCase();
                return currentPhaseLower.includes(mappedPhase);
            });
        }
    }
    
    class TargetingSystem {
        getValidTargets(ability, caster) {
            if (!ability.targeting) return [];
            
            const criteria = ability.targeting.targeting_criteria;
            const range = ability.targeting.range;
            const validTargets = [];
            
            // Get all friendly units (for now, we'll implement range checking later)
            const allUnits = gameState.factionData?.units || [];
            
            // Debug: Check if faction data is loaded
            if (!gameState.factionData) {
                console.error('gameState.factionData is not loaded!');
                return [];
            }
            
            if (!allUnits || allUnits.length === 0) {
                console.error('No units found in faction data!');
                return [];
            }
            
            console.log('Targeting debug:', {
                ability: ability.name,
                caster: caster.name,
                criteria: criteria,
                gameStateFactionData: gameState.factionData,
                allUnitsCount: allUnits.length,
                allUnits: allUnits.map(u => ({ name: u.name, keywords: u.keywords }))
            });
            
            allUnits.forEach(unit => {
                const isValid = this.isValidTarget(unit, criteria, caster);
                console.log(`Checking ${unit.name}:`, {
                    keywords: unit.keywords,
                    isValid: isValid,
                    criteria: criteria
                });
                
                if (isValid) {
                    validTargets.push(unit);
                }
            });
            
            return validTargets;
        }
        
        isValidTarget(unit, criteria, caster) {
            // Check if unit matches keywords
            if (criteria.keywords) {
                const unitKeywords = unit.keywords || [];
                const hasRequiredKeywords = criteria.keywords.every(keyword =>
                    unitKeywords.some(unitKeyword => 
                        unitKeyword.toLowerCase() === keyword.toLowerCase()
                    )
                );
                if (!hasRequiredKeywords) return false;
            }
            
            // Check if excluding self
            if (criteria.exclude_self && unit.name === caster.name) {
                return false;
            }
            
            // Check max targets (will be handled at selection level)
            
            return true;
        }
    }
    
    class EffectManager {
        constructor() {
            this.activeEffects = [];
            this.effectHistory = [];
        }
        
        addEffect(effect) {
            this.activeEffects.push(effect);
            this.effectHistory.push({
                ...effect,
                addedAt: new Date().toISOString()
            });
            this.updateEffectDisplay();
        }
        
        removeEffect(effectId) {
            const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
            if (effectIndex !== -1) {
                const effect = this.activeEffects[effectIndex];
                this.activeEffects.splice(effectIndex, 1);
                this.effectHistory.push({
                    ...effect,
                    removedAt: new Date().toISOString()
                });
                this.updateEffectDisplay();
            }
        }
        
        getEffectsForUnit(unitName) {
            return this.activeEffects.filter(effect => 
                effect.target.name === unitName && effect.isActive
            );
        }
        
        cleanupExpiredEffects() {
            const expiredEffects = this.activeEffects.filter(effect => {
                try {
                    return effect && effect.isExpired && effect.isExpired();
                } catch (error) {
                    console.warn('Error checking if effect is expired:', error, effect);
                    return true; // Remove problematic effects
                }
            });
            expiredEffects.forEach(effect => {
                this.removeEffect(effect.id);
            });
        }
        
        updateEffectDisplay() {
            console.log('Updating effect display for', this.activeEffects.length, 'active effects');
            
            // Update all unit cards to show their current effects
            const unitCards = document.querySelectorAll('.unit-card');
            unitCards.forEach(card => {
                this.updateUnitCardEffects(card);
            });
        }
        
        updateUnitCardEffects(unitCard) {
            // Get the unit name from the card
            const unitNameElement = unitCard.querySelector('h3');
            if (!unitNameElement) return;
            
            const unitName = unitNameElement.textContent;
            
            // Get effects for this unit
            const unitEffects = this.getEffectsForUnit(unitName);
            
            // Remove existing effect indicators
            unitCard.classList.remove('has-effects', 'has-active-effects');
            
            // Remove existing temporary effect abilities
            const existingTempAbilities = unitCard.querySelectorAll('.temp-effect-ability');
            existingTempAbilities.forEach(ability => ability.remove());
            
            // Add visual indicators if there are active effects
            if (unitEffects.length > 0) {
                unitCard.classList.add('has-effects');
                
                // Check if any effects are active in current phase
                const activeEffects = unitEffects.filter(effect => {
                    try {
                        return effect && effect.isActiveInCurrentPhase && effect.isActiveInCurrentPhase();
                    } catch (error) {
                        console.warn('Error checking if effect is active:', error, effect);
                        return false;
                    }
                });
                
                if (activeEffects.length > 0) {
                    unitCard.classList.add('has-active-effects');
                    
                    // Add temporary effect abilities to the abilities list
                    const abilitiesList = unitCard.querySelector('.abilities-list');
                    if (abilitiesList) {
                        activeEffects.forEach(effect => {
                            const tempAbility = document.createElement('li');
                            tempAbility.className = 'temp-effect-ability';
                            
                            const abilitySpan = document.createElement('span');
                            abilitySpan.className = 'ability-name temp-effect';
                            abilitySpan.setAttribute('data-description', effect.ability.effects[0]?.description || 'Active effect');
                            abilitySpan.setAttribute('data-timing', 'Active Effect');
                            abilitySpan.setAttribute('data-frequency', 'Temporary');
                            abilitySpan.textContent = `${effect.ability.effects[0]?.symbol || '⚡'} ${effect.ability.name}`;
                            
                            // Add tooltip event listeners (same as other ability names)
                            abilitySpan.addEventListener('mouseover', showTooltip);
                            abilitySpan.addEventListener('mouseout', hideTooltip);
                            abilitySpan.addEventListener('mousemove', (e) => {
                                // Update position on mouse move
                            });
                            
                            // Add click handler for debugging
                            abilitySpan.addEventListener('click', () => {
                                console.log('Temporary effect clicked:', effect);
                            });
                            
                            tempAbility.appendChild(abilitySpan);
                            abilitiesList.appendChild(tempAbility);
                        });
                    }
                }
            }
        }
    }
    
    // Initialize targeting system and effect manager
    const targetingSystem = new TargetingSystem();
    const effectManager = new EffectManager();
    
    // Helper function to generate unique IDs
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // --- ABILITY USAGE TRACKING ---
    function getAbilityUsageKey(unitName, abilityName) {
        return `${unitName}:${abilityName}`;
    }
    
    function canUseAbility(unitName, abilityName) {
        const key = getAbilityUsageKey(unitName, abilityName);
        const usage = gameState.abilityUsage[key];
        
        if (!usage) {
            // First time using this ability, check if it has usage limits
            const unit = gameState.factionData?.units?.find(u => u.name === unitName);
            const ability = unit?.abilities?.find(a => a.name === abilityName);
            
            if (ability?.usage) {
                // Initialize usage tracking
                gameState.abilityUsage[key] = {
                    used: 0,
                    maxUses: ability.usage.max_uses,
                    resetPeriod: ability.usage.reset_period
                };
                return true; // Can use it for the first time
            }
            return true; // No usage limits, can always use
        }
        
        return usage.used < usage.maxUses;
    }
    
    function useAbility(unitName, abilityName) {
        const key = getAbilityUsageKey(unitName, abilityName);
        const usage = gameState.abilityUsage[key];
        
        if (usage) {
            usage.used++;
            console.log(`Used ${abilityName} (${usage.used}/${usage.maxUses})`);
        }
    }
    
    function resetAbilityUsage(resetPeriod) {
        Object.keys(gameState.abilityUsage).forEach(key => {
            const usage = gameState.abilityUsage[key];
            if (usage.resetPeriod === resetPeriod) {
                usage.used = 0;
                console.log(`Reset ability usage for ${key}`);
            }
        });
    }
    
    // Ability activation function with targeting modal
    function activateAbility(ability, caster) {
        console.log(`Activating ability: ${ability.name} from ${caster.name}`);
        
        // Check if ability can be used
        if (!canUseAbility(caster.name, ability.name)) {
            console.log(`Cannot use ${ability.name} - usage limit reached`);
            // Could show a message to the user here
            return;
        }
        
        // Check if ability has targeting
        if (ability.targeting) {
            console.log('Ability requires targeting - showing targeting modal');
            const validTargets = targetingSystem.getValidTargets(ability, caster);
            console.log('Valid targets:', validTargets.map(t => t.name));
            
            if (validTargets.length > 0) {
                // Show targeting modal
                showTargetingModal(ability, caster);
            } else {
                console.log('No valid targets found for this ability');
                // Could show a message to the user here
            }
        } else {
            // Non-targeting ability - apply directly to caster
            applyAbilityEffects(ability, caster, caster);
        }
    }
    
    function applyAbilityEffects(ability, target, caster) {
        if (!ability.effects) return;
        
        // Track ability usage
        useAbility(caster.name, ability.name);
        
        ability.effects.forEach(effectData => {
            const effect = new AbilityEffect(
                ability,
                target,
                caster,
                effectData.duration,
                effectData.active_phases
            );
            
            effectManager.addEffect(effect);
            console.log(`Applied effect: ${effectData.description} to ${target.name}`);
            
            // Update the display immediately
            effectManager.updateEffectDisplay();
        });
    }
    
    // Test function for development (can be called from browser console)
    function testAbilityTargeting() {
        console.log('=== Testing Ability Targeting System ===');
        
        if (!gameState.factionData) {
            console.log('No faction data loaded yet');
            return;
        }
        
        // Find the Saurus Oldblood on Carnosaur
        const caster = gameState.factionData.units.find(u => u.name === 'Saurus Oldblood on Carnosaur');
        if (!caster) {
            console.log('Saurus Oldblood on Carnosaur not found');
            return;
        }
        
        // Find the Ancient Warlord ability
        const ability = caster.abilities.find(a => a.name === 'Ancient Warlord');
        if (!ability) {
            console.log('Ancient Warlord ability not found');
            return;
        }
        
        console.log('Testing ability:', ability.name);
        console.log('Caster:', caster.name);
        
        // Test targeting system
        const validTargets = targetingSystem.getValidTargets(ability, caster);
        console.log('Valid targets found:', validTargets.length);
        validTargets.forEach(target => {
            console.log(`- ${target.name} (${target.keywords.join(', ')})`);
        });
        
        // Test ability activation (this will now show the targeting modal)
        if (validTargets.length > 0) {
            console.log('Activating ability (will show targeting modal)...');
            activateAbility(ability, caster);
        }
        
        console.log('Active effects:', effectManager.activeEffects.length);
        effectManager.activeEffects.forEach(effect => {
            console.log(`- ${effect.ability.name} on ${effect.target.name} (${effect.duration})`);
        });
    }
    
    // Test function for Saurus Warriors Battle Cry ability
    function testBattleCry() {
        console.log('=== Testing Battle Cry Ability ===');
        
        if (!gameState.factionData) {
            console.log('No faction data loaded yet');
            return;
        }
        
        // Find the Saurus Warriors
        const caster = gameState.factionData.units.find(u => u.name === 'Saurus Warriors');
        if (!caster) {
            console.log('Saurus Warriors not found');
            return;
        }
        
        // Find the Battle Cry ability
        const ability = caster.abilities.find(a => a.name === 'Battle Cry');
        if (!ability) {
            console.log('Battle Cry ability not found');
            return;
        }
        
        console.log('Testing ability:', ability.name);
        console.log('Caster:', caster.name);
        
        // Test ability activation (this will show the targeting modal)
        activateAbility(ability, caster);
    }
    
    // Test function for effect display
    function testEffectDisplay() {
        console.log('=== Testing Effect Display System ===');
        
        if (!gameState.factionData) {
            console.log('No faction data loaded yet');
            return;
        }
        
        console.log('Current phase:', gameState.phaseNames[gameState.currentPhase]);
        console.log('Active effects:', effectManager.activeEffects.length);
        effectManager.activeEffects.forEach(effect => {
            console.log(`- ${effect.ability.name} on ${effect.target.name}:`, {
                duration: effect.duration,
                activePhases: effect.activePhases,
                isActiveInCurrentPhase: effect.isActiveInCurrentPhase(),
                appliedAt: effect.appliedAt,
                symbol: effect.ability.effects[0]?.symbol
            });
        });
        
        // Check unit cards
        const unitCards = document.querySelectorAll('.unit-card');
        console.log('Unit cards found:', unitCards.length);
        unitCards.forEach(card => {
            const unitName = card.querySelector('h3')?.textContent;
            const effectSymbols = card.querySelector('.effect-symbols');
            console.log(`Unit: ${unitName}, Has effect symbols: ${!!effectSymbols}`);
        });
        
        // Force update effect display
        effectManager.updateEffectDisplay();
        console.log('Effect display updated');
    }
    
    // Test function to change phase for testing effects
    function testChangePhase(phaseIndex) {
        if (phaseIndex >= 0 && phaseIndex < gameState.phases.length) {
            gameState.currentPhase = phaseIndex;
            console.log(`Changed to phase: ${gameState.phaseNames[gameState.currentPhase]}`);
            effectManager.updateEffectDisplay();
            updateGameDisplay();
        } else {
            console.log('Available phases:', gameState.phaseNames.map((name, index) => `${index}: ${name}`));
        }
    }
    
    // Test function to check tooltip functionality
    function testTooltips() {
        console.log('=== Testing Tooltip System ===');
        
        const abilityNames = document.querySelectorAll('.ability-name');
        console.log('Found ability-name elements:', abilityNames.length);
        
        abilityNames.forEach((span, index) => {
            const description = span.getAttribute('data-description');
            const timing = span.getAttribute('data-timing');
            const frequency = span.getAttribute('data-frequency');
            
            console.log(`Element ${index}:`, {
                text: span.textContent,
                description: description,
                timing: timing,
                frequency: frequency,
                hasTooltipListeners: span.onmouseover !== null
            });
        });
        
        // Check for temporary effects specifically
        const tempEffects = document.querySelectorAll('.temp-effect');
        console.log('Found temporary effect elements:', tempEffects.length);
        tempEffects.forEach((span, index) => {
            console.log(`Temp effect ${index}:`, {
                text: span.textContent,
                description: span.getAttribute('data-description'),
                hasTooltipListeners: span.onmouseover !== null
            });
        });
    }
    
    // Test function for ability usage tracking
    function testAbilityUsage() {
        console.log('=== Testing Ability Usage System ===');
        
        console.log('Current ability usage:', gameState.abilityUsage);
        
        // Test specific abilities
        const testAbilities = [
            { unit: 'Saurus Oldblood on Carnosaur', ability: 'Ancient Warlord' },
            { unit: 'Saurus Warriors', ability: 'Battle Cry' },
            { unit: 'Saurus Warriors', ability: 'Desperate Stand' }
        ];
        
        testAbilities.forEach(({ unit, ability }) => {
            const canUse = canUseAbility(unit, ability);
            const usage = gameState.abilityUsage[getAbilityUsageKey(unit, ability)];
            console.log(`${unit} - ${ability}:`, {
                canUse: canUse,
                usage: usage
            });
        });
    }
    
    // Make test functions available globally for console testing
    window.testAbilityTargeting = testAbilityTargeting;
    window.testBattleCry = testBattleCry;
    window.testEffectDisplay = testEffectDisplay;
    window.testChangePhase = testChangePhase;
    window.testTooltips = testTooltips;
    window.testAbilityUsage = testAbilityUsage;
    
    // --- TARGETING MODAL SYSTEM ---
    const targetingModal = document.getElementById('targeting-modal');
    const targetingModalTitle = document.getElementById('targeting-modal-title');
    const targetingAbilityName = document.getElementById('targeting-ability-name');
    const targetingAbilityDescription = document.getElementById('targeting-ability-description');
    const targetingRange = document.getElementById('targeting-range');
    const targetingKeywords = document.getElementById('targeting-keywords');
    const targetingUnitsGrid = document.getElementById('targeting-units-grid');
    const cancelTargetingBtn = document.getElementById('cancel-targeting-btn');
    
    let currentTargetingAbility = null;
    let currentTargetingCaster = null;
    let selectedTarget = null;
    
    function showTargetingModal(ability, caster) {
        currentTargetingAbility = ability;
        currentTargetingCaster = caster;
        selectedTarget = null;
        
        // Populate modal with ability information
        targetingModalTitle.textContent = `Select Target for ${ability.name}`;
        targetingAbilityName.textContent = ability.name;
        targetingAbilityDescription.textContent = ability.description;
        
        // Show targeting criteria
        if (ability.targeting) {
            targetingRange.textContent = `Range: ${ability.targeting.range}`;
            targetingKeywords.textContent = `Keywords: ${ability.targeting.targeting_criteria.keywords.join(', ')}`;
        }
        
        // Get valid targets and populate the grid
        const validTargets = targetingSystem.getValidTargets(ability, caster);
        populateTargetingGrid(validTargets);
        
        // Show modal
        targetingModal.style.display = 'flex';
        
        // Add event listeners
        cancelTargetingBtn.onclick = closeTargetingModal;
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target === targetingModal) {
                closeTargetingModal();
            }
        };
    }
    
    function populateTargetingGrid(validTargets) {
        targetingUnitsGrid.innerHTML = '';
        
        if (validTargets.length === 0) {
            targetingUnitsGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">No valid targets found</p>';
            return;
        }
        
        validTargets.forEach(unit => {
            const unitCard = createTargetingUnitCard(unit);
            targetingUnitsGrid.appendChild(unitCard);
        });
    }
    
    function createTargetingUnitCard(unit) {
        const card = document.createElement('div');
        card.className = 'targeting-unit-card';
        card.dataset.unitName = unit.name;
        
        // Check if unit is valid target
        const isValid = targetingSystem.isValidTarget(unit, currentTargetingAbility.targeting.targeting_criteria, currentTargetingCaster);
        if (!isValid) {
            card.classList.add('invalid');
        }
        
        card.innerHTML = `
            <div class="targeting-unit-name">${unit.name}</div>
            <div class="targeting-unit-keywords">${unit.keywords.join(', ')}</div>
            <div class="targeting-unit-stats">
                <div class="targeting-unit-stat">
                    <span class="stat-label">Move:</span>
                    <span>${unit.stats.move}</span>
                </div>
                <div class="targeting-unit-stat">
                    <span class="stat-label">Health:</span>
                    <span>${unit.stats.health}</span>
                </div>
                <div class="targeting-unit-stat">
                    <span class="stat-label">Control:</span>
                    <span>${unit.stats.control}</span>
                </div>
                <div class="targeting-unit-stat">
                    <span class="stat-label">Save:</span>
                    <span>${unit.stats.save}</span>
                </div>
            </div>
        `;
        
        // Add click handler
        card.addEventListener('click', () => {
            if (card.classList.contains('invalid')) return;
            
            // Remove previous selection
            document.querySelectorAll('.targeting-unit-card.selected').forEach(c => {
                c.classList.remove('selected');
            });
            
            // Select this card
            card.classList.add('selected');
            selectedTarget = unit;
            
            // Apply the ability effects
            applyAbilityEffects(currentTargetingAbility, selectedTarget, currentTargetingCaster);
            
            // Close modal
            closeTargetingModal();
        });
        
        return card;
    }
    
    function closeTargetingModal() {
        targetingModal.style.display = 'none';
        currentTargetingAbility = null;
        currentTargetingCaster = null;
        selectedTarget = null;
    }
    
    // --- TURN ORDER SELECTION ---
    const turnOrderSelection = document.getElementById('turn-order-selection');
    const roundNumberSpan = document.getElementById('round-number');
    const playerFirstBtn = document.getElementById('player-first-btn');
    const opponentFirstBtn = document.getElementById('opponent-first-btn');
    
    // --- CARD DISPLAY ---
    const cardDisplay = document.getElementById('card-display');
    const currentCards = document.getElementById('current-cards');
    const cardTitle = document.getElementById('card-title');
    const toggleCardsBtn = document.getElementById('toggle-cards-btn');
    
    let showingAllCards = false;

    // --- MODALS ---
    const turnModal = document.getElementById('turn-modal');
    const yourTurnBtn = document.getElementById('your-turn-btn');
    const enemyTurnBtn = document.getElementById('enemy-turn-btn');
    const gameOverModal = document.getElementById('game-over-modal');
    const newGameBtn = document.getElementById('new-game-btn');
    const closeGameBtn = document.getElementById('close-game-btn');
    
    // --- BATTLE TACTIC MODAL ---
    const tacticModal = document.getElementById('tactic-modal');
    const closeTacticBtn = document.getElementById('close-tactic-btn');
    const useCommandBtn = document.getElementById('use-command-btn');
    
    // --- SCORING MODAL ---
    const scoringModal = document.getElementById('scoring-modal');
    const confirmScoringBtn = document.getElementById('confirm-scoring-btn');
    const battleTacticsScoring = document.getElementById('battle-tactics-scoring');
    const primaryScoreSpan = document.getElementById('primary-score');
    const tacticScoreSpan = document.getElementById('tactic-score');
    const roundTotalSpan = document.getElementById('round-total');
    const gameTotalSpan = document.getElementById('game-total');
    
    // --- CARD DRAWING MODAL ---
    const cardDrawingModal = document.getElementById('card-drawing-modal');
    const confirmCardDrawingBtn = document.getElementById('confirm-card-drawing-btn');
    const cardManagementCards = document.getElementById('card-management-cards');

    // --- CARD FUNCTIONS ---
    function loadBattleTactics() {
        fetch('data/battle_tactics.json')
            .then(response => response.json())
            .then(data => {
                gameState.battleTactics = data.battleTactics;
                console.log('Battle tactics loaded:', gameState.battleTactics);
            })
            .catch(error => {
                console.error('Error loading battle tactics:', error);
            });
    }

    // Card status management functions
    function getCardStatus(cardNumber) {
        return gameState.cardStates[cardNumber] || 'Pending';
    }

    function setCardStatus(cardNumber, status) {
        const validStatuses = ['Pending', 'Used', 'Scored', 'Kept', 'Discarded'];
        if (!validStatuses.includes(status)) {
            console.error(`Invalid card status: ${status}`);
            return;
        }
        
        // Update the centralized status
        gameState.cardStates[cardNumber] = status;
        
        // Update the current cards display if this card is in the current round
        if (gameState.currentRoundCards.includes(cardNumber)) {
            updateCurrentCardsDisplay();
        }
        
        // Update legacy arrays for backward compatibility
        const cardNum = parseInt(cardNumber);
        
        // Remove from all legacy arrays first
        gameState.usedCards = gameState.usedCards.filter(c => c !== cardNum);
        gameState.keptCards = gameState.keptCards.filter(c => c !== cardNum);
        gameState.scoredCards = gameState.scoredCards.filter(c => c !== cardNum);
        
        // Add to appropriate legacy array
        switch (status) {
            case 'Used':
                if (!gameState.usedCards.includes(cardNum)) {
                    gameState.usedCards.push(cardNum);
                }
                break;
            case 'Scored':
                if (!gameState.scoredCards.includes(cardNum)) {
                    gameState.scoredCards.push(cardNum);
                }
                break;
            case 'Kept':
                if (!gameState.keptCards.includes(cardNum)) {
                    gameState.keptCards.push(cardNum);
                }
                break;
        }
        
        console.log(`Card ${cardNumber} status set to: ${status}`);
    }

    // Modal logic controller
    function determineModalAndButtonState(isEndOfRound, isPlayerTurn) {
        const startingPlayer = gameState.startingPlayer || 'player';
        
        // Determine if modal should appear
        let showModal = false;
        let showPrimary = false;
        let availableButtons = [];
        
        if (isEndOfRound) {
            if (startingPlayer === 'player') {
                if (isPlayerTurn) {
                    // Player starts, end of player's turn
                    showModal = true;
                    showPrimary = true;
                    availableButtons = ['score', 'keep'];
                } else {
                    // Player starts, end of enemy's turn  
                    showModal = true;
                    showPrimary = false;
                    availableButtons = ['keep', 'discard'];
                }
            } else {
                // Enemy starts
                if (isPlayerTurn) {
                    // Enemy starts, end of player's turn
                    showModal = true;
                    showPrimary = true;
                    availableButtons = ['score', 'discard', 'keep'];
                } else {
                    // Enemy starts, end of enemy's turn
                    showModal = false;
                    showPrimary = false;
                    availableButtons = [];
                }
            }
        }
        
        return {
            showModal,
            showPrimary,
            allowedActions: availableButtons
        };
    }
    
    function drawCardsForRound() {
        // Start with kept cards from previous round
        const cardsForThisRound = [...gameState.keptCards];
        
        // Set kept cards status back to Pending for the new round
        gameState.keptCards.forEach(cardNumber => {
            setCardStatus(cardNumber, 'Pending');
        });
        gameState.keptCards = []; // Clear kept cards
        
        // Clear any cards that weren't kept (used, scored, or binned)
        gameState.currentRoundCards = [];
        
        // Get available cards (not yet drawn and not kept)
        const availableCards = gameState.allCards.filter(card => 
            !gameState.drawnCards.includes(card) && !cardsForThisRound.includes(card)
        );
        
        // Draw additional cards to reach 3 total
        const cardsToDraw = 3 - cardsForThisRound.length;
        for (let i = 0; i < cardsToDraw && availableCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            const drawnCard = availableCards.splice(randomIndex, 1)[0];
            cardsForThisRound.push(drawnCard);
            gameState.drawnCards.push(drawnCard);
            
            // Set new cards as Pending
            setCardStatus(drawnCard, 'Pending');
        }
        
        // Track which round these cards were drawn in
        gameState.cardsByRound[gameState.currentRound] = cardsForThisRound;
        gameState.currentRoundCards = cardsForThisRound;
        displayCurrentCards();
        updateCurrentCardsDisplay(); // Update the new current cards display
    }
    
    function displayCurrentCards() {
        currentCards.innerHTML = '';
        
        // Get all cards for the current round (regardless of status)
        const currentRoundCards = gameState.cardsByRound[gameState.currentRound] || [];
        
        if (currentRoundCards.length === 0) {
            currentCards.innerHTML = '<p style="color: white; font-style: italic;">No cards drawn for this round</p>';
            return;
        }
        
        currentRoundCards.forEach(cardNumber => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.cardNumber = cardNumber;
            
            // Use the centralized card status system
            const cardStatus = getCardStatus(cardNumber);
            cardElement.classList.add(cardStatus.toLowerCase());
            
            // Find the battle tactic for this card
            const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
            if (tactic) {
                // Display the tactic name
                cardElement.textContent = tactic.name;
                cardElement.title = `${tactic.name}: ${tactic.requirement} [Status: ${cardStatus}]`; // Show name, requirement, and status on hover
            } else {
                cardElement.textContent = cardNumber;
                cardElement.title = `Card ${cardNumber} [Status: ${cardStatus}]`;
            }
            
            // Add click event
            cardElement.addEventListener('click', () => showTacticDetails(cardNumber));
            currentCards.appendChild(cardElement);
        });
    }
    
    function displayAllDrawnCards() {
        currentCards.innerHTML = '';
        
        if (gameState.drawnCards.length === 0) {
            currentCards.innerHTML = '<p style="color: white; font-style: italic;">No cards drawn yet</p>';
            return;
        }
        
        // Create container for round-organized cards
        const roundsContainer = document.createElement('div');
        roundsContainer.className = 'rounds-container';
        
        // Display cards by round
        Object.keys(gameState.cardsByRound).forEach(roundNumber => {
            const roundCards = gameState.cardsByRound[roundNumber];
            
            // Create round section
            const roundSection = document.createElement('div');
            roundSection.className = 'round-section';
            
            // Add round label
            const roundLabel = document.createElement('div');
            roundLabel.className = 'round-label';
            roundLabel.textContent = `Round ${roundNumber}`;
            roundSection.appendChild(roundLabel);
            
            // Add cards for this round
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'cards-container';
            
            roundCards.forEach(cardNumber => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card drawn';
                cardElement.dataset.cardNumber = cardNumber;
                
                // Use the centralized card status system
                const cardStatus = getCardStatus(cardNumber);
                cardElement.classList.add(cardStatus.toLowerCase());
                
                // Find the battle tactic for this card
                const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
                if (tactic) {
                    // Display the tactic name
                    cardElement.textContent = tactic.name;
                    cardElement.title = `${tactic.name}: ${tactic.requirement} [Status: ${cardStatus}]`; // Show name, requirement, and status on hover
                } else {
                    cardElement.textContent = cardNumber;
                    cardElement.title = `Card ${cardNumber} [Status: ${cardStatus}]`;
                }
                
                // Add click event
                cardElement.addEventListener('click', () => showTacticDetails(cardNumber));
                cardsContainer.appendChild(cardElement);
            });
            
            roundSection.appendChild(cardsContainer);
            roundsContainer.appendChild(roundSection);
        });
        
        currentCards.appendChild(roundsContainer);
    }
    
    function showTacticDetails(cardNumber, fromModal = null) {
        const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
        if (!tactic) return;
        
        // Track which modal was open before this one
        if (fromModal) {
            previousModal = fromModal;
        }
        
        const tacticTitle = document.getElementById('tactic-title');
        const tacticDescription = document.getElementById('tactic-description');
        const tacticRequirement = document.getElementById('tactic-requirement');
        const commandName = document.getElementById('command-name');
        const commandTiming = document.getElementById('command-timing');
        const commandDeclare = document.getElementById('command-declare');
        const commandEffect = document.getElementById('command-effect');
        
        tacticTitle.textContent = `${tactic.name} (Card ${cardNumber})`;
        tacticDescription.textContent = tactic.description;
        tacticRequirement.textContent = tactic.requirement;
        commandName.textContent = tactic.command.name;
        commandTiming.textContent = tactic.command.timing;
        commandDeclare.textContent = tactic.command.declare;
        commandEffect.textContent = tactic.command.effect;
        
        // Store the current card number for the use command button
        tacticModal.dataset.currentCard = cardNumber;
        
        // Check if card is from current round and its status
        const currentRoundCards = gameState.cardsByRound[gameState.currentRound] || [];
        const isCurrentRoundCard = currentRoundCards.includes(cardNumber);
        const cardStatus = getCardStatus(cardNumber);
        
        if (!isCurrentRoundCard) {
            useCommandBtn.textContent = 'Not Current Round';
            useCommandBtn.disabled = true;
        } else if (cardStatus === 'Used') {
            useCommandBtn.textContent = 'Command Used';
            useCommandBtn.disabled = true;
        } else if (cardStatus === 'Scored') {
            useCommandBtn.textContent = 'Card Scored';
            useCommandBtn.disabled = true;
        } else if (cardStatus === 'Kept') {
            useCommandBtn.textContent = 'Card Kept';
            useCommandBtn.disabled = true;
        } else if (cardStatus === 'Discarded') {
            useCommandBtn.textContent = 'Card Discarded';
            useCommandBtn.disabled = true;
        } else {
            useCommandBtn.textContent = 'Use Command';
            useCommandBtn.disabled = false;
        }
        
        tacticModal.style.display = 'flex';
    }
    
    function toggleCardView() {
        showingAllCards = !showingAllCards;
        
        if (showingAllCards) {
            cardTitle.textContent = 'All Drawn Cards';
            toggleCardsBtn.textContent = 'Show Current Round';
            displayAllDrawnCards();
        } else {
            cardTitle.textContent = 'Round Cards';
            toggleCardsBtn.textContent = 'Show All Drawn';
            displayCurrentCards();
        }
    }

        // --- SCORING FUNCTIONS ---
    function showScoringModal() {
        console.log('showScoringModal called');
        console.log('gameState.currentTurn:', gameState.currentTurn);
        
        // Only show scoring modal on player turns
        if (gameState.currentTurn !== 'player') {
            console.log('Not player turn, skipping scoring modal');
            // If it's enemy turn, skip scoring and go to next turn
            continueToNextTurn();
            return;
        }
        
        console.log('Showing scoring modal for player turn');
        
        // Reset primary checkboxes
        document.getElementById('primary-1').checked = false;
        document.getElementById('primary-2').checked = false;
        document.getElementById('primary-3').checked = false;
        
        // Clear previous battle tactics
        battleTacticsScoring.innerHTML = '';
        
        // Get available battle tactics (only cards with Pending status from current round)
        const currentRoundCards = gameState.cardsByRound[gameState.currentRound] || [];
        const availableTactics = currentRoundCards.filter(cardNumber => 
            getCardStatus(cardNumber) === 'Pending'
        );
        
        // Create battle tactic cards for scoring (only score option)
        availableTactics.forEach(cardNumber => {
            const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
            if (!tactic) return;
            
            const tacticCard = document.createElement('div');
            tacticCard.className = 'tactic-scoring-card';
            tacticCard.dataset.cardNumber = cardNumber;
            
            tacticCard.innerHTML = `
                <div class="tactic-card-info">
                    <div class="tactic-card-name">${tactic.name}</div>
                    <div class="tactic-card-requirement">${tactic.requirement}</div>
                </div>
                <div class="tactic-card-actions">
                    <button class="tactic-action-btn score-btn" data-action="score">Score</button>
                </div>
            `;
            
            // Add event listener for score button
            const scoreBtn = tacticCard.querySelector('.tactic-action-btn');
            scoreBtn.addEventListener('click', () => handleTacticAction(cardNumber, 'score', tacticCard));
            
            battleTacticsScoring.appendChild(tacticCard);
        });
        
        // Remove any existing event listeners and add new ones for primary objective checkboxes
        const primary1 = document.getElementById('primary-1');
        const primary2 = document.getElementById('primary-2');
        const primary3 = document.getElementById('primary-3');
        
        // Clone elements to remove all event listeners
        const newPrimary1 = primary1.cloneNode(true);
        const newPrimary2 = primary2.cloneNode(true);
        const newPrimary3 = primary3.cloneNode(true);
        
        primary1.parentNode.replaceChild(newPrimary1, primary1);
        primary2.parentNode.replaceChild(newPrimary2, primary2);
        primary3.parentNode.replaceChild(newPrimary3, primary3);
        
        // Add fresh event listeners
        newPrimary1.addEventListener('change', () => {
            console.log('primary-1 changed, checked:', newPrimary1.checked);
            updateModalScoreDisplay();
        });
        newPrimary2.addEventListener('change', () => {
            console.log('primary-2 changed, checked:', newPrimary2.checked);
            updateModalScoreDisplay();
        });
        newPrimary3.addEventListener('change', () => {
            console.log('primary-3 changed, checked:', newPrimary3.checked);
            updateModalScoreDisplay();
        });
        
        // Initialize score display
        updateModalScoreDisplay();
        
        // Update the round title
        const scoringRoundTitle = document.getElementById('scoring-round-title');
        if (scoringRoundTitle) {
            scoringRoundTitle.textContent = `Score Round ${gameState.currentRound} - Your Turn`;
        }
        
        // Show modal
        scoringModal.style.display = 'flex';
    }
    
    function handleTacticAction(cardNumber, action, tacticCard) {
        if (action === 'score') {
            setCardStatus(cardNumber, 'Scored');
            // Add to scores for the current round
            if (!gameState.scores.rounds[gameState.currentRound]) {
                gameState.scores.rounds[gameState.currentRound] = {
                    primary: 0,
                    tactics: 0,
                    total: 0
                };
            }
            gameState.scores.rounds[gameState.currentRound].tactics++;
            tacticCard.remove();
            
            // Update the card display to reflect new status
            displayCurrentCards();
            updateModalScoreDisplay();
        }
    }
    
    function updateModalScoreDisplay() {
        // Calculate primary score
        let primaryScore = 0;
        const primary1 = document.getElementById('primary-1');
        const primary2 = document.getElementById('primary-2');
        const primary3 = document.getElementById('primary-3');
        
        console.log('updateModalScoreDisplay called');
        console.log('primary1:', primary1, 'checked:', primary1?.checked);
        console.log('primary2:', primary2, 'checked:', primary2?.checked);
        console.log('primary3:', primary3, 'checked:', primary3?.checked);
        
        if (primary1 && primary1.checked) primaryScore++;
        if (primary2 && primary2.checked) primaryScore++;
        if (primary3 && primary3.checked) primaryScore++;
        
        console.log('calculated primaryScore:', primaryScore);
        
        // Get current round tactic score
        const tacticScore = (gameState.scores.rounds[gameState.currentRound] || { tactics: 0 }).tactics;
        
        // Calculate round total
        const roundTotal = primaryScore + tacticScore;
        
        // Calculate game total without double-counting the current round
        let gameTotal = 0;
        Object.entries(gameState.scores.rounds).forEach(([roundNumber, roundScore]) => {
            if (parseInt(roundNumber, 10) !== gameState.currentRound) {
                gameTotal += roundScore.total;
            }
        });
        gameTotal += roundTotal; // Add preview of current round
        
        // Update display
        console.log('Updating modal display with scores:', { primaryScore, tacticScore, roundTotal, gameTotal });
        primaryScoreSpan.textContent = primaryScore;
        tacticScoreSpan.textContent = tacticScore;
        roundTotalSpan.textContent = roundTotal;
        gameTotalSpan.textContent = gameTotal;
        
        console.log('Modal display elements after update:');
        console.log('primaryScoreSpan.textContent:', primaryScoreSpan.textContent);
        console.log('tacticScoreSpan.textContent:', tacticScoreSpan.textContent);
        console.log('roundTotalSpan.textContent:', roundTotalSpan.textContent);
        console.log('gameTotalSpan.textContent:', gameTotalSpan.textContent);
    }
    
    function confirmScoring() {
        // Calculate final scores for this round
        let primaryScore = 0;
        const primary1 = document.getElementById('primary-1');
        const primary2 = document.getElementById('primary-2');
        const primary3 = document.getElementById('primary-3');
        
        console.log('confirmScoring called');
        console.log('primary1:', primary1, 'checked:', primary1?.checked);
        console.log('primary2:', primary2, 'checked:', primary2?.checked);
        console.log('primary3:', primary3, 'checked:', primary3?.checked);
        
        if (primary1 && primary1.checked) primaryScore++;
        if (primary2 && primary2.checked) primaryScore++;
        if (primary3 && primary3.checked) primaryScore++;
        
        console.log('final primaryScore for round:', primaryScore);
        
        const tacticScore = (gameState.scores.rounds[gameState.currentRound] || { tactics: 0 }).tactics;
        const roundTotal = primaryScore + tacticScore;
        
        // Store the round scores
        gameState.scores.rounds[gameState.currentRound] = {
            primary: primaryScore,
            tactics: tacticScore,
            total: roundTotal
        };
        
        // Update game total
        gameState.scores.gameTotal = Object.values(gameState.scores.rounds).reduce((sum, round) => sum + round.total, 0);
        
        // Update main page display
        updateGameDisplay();
        
        // Close scoring modal
        scoringModal.style.display = 'none';
        
        // Check if this is the end of the round
        // If enemy goes first, then when player finishes their turn, it's the end of the round
        if (gameState.startingPlayer === 'enemy') {
            // Enemy goes first, so when player finishes their turn, it's the end of the round
            showCardDrawingModal();
        } else {
            // Player goes first, so continue to enemy turn
            continueToNextTurn();
        }
    }
    
    // --- CARD DRAWING MODAL FUNCTIONS ---
    function showCardDrawingModal() {
        // Clear previous cards
        cardManagementCards.innerHTML = '';
        
        // Get all cards from current round that haven't been scored
        const currentRoundCards = gameState.cardsByRound[gameState.currentRound] || [];
        const availableCards = currentRoundCards.filter(cardNumber => 
            getCardStatus(cardNumber) === 'Pending'
        );
        
        // Create card management cards
        availableCards.forEach(cardNumber => {
            const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
            if (!tactic) return;
            
            const cardElement = document.createElement('div');
            cardElement.className = 'tactic-scoring-card';
            cardElement.dataset.cardNumber = cardNumber;
            
            cardElement.innerHTML = `
                <div class="tactic-card-info">
                    <div class="tactic-card-name">${tactic.name}</div>
                    <div class="tactic-card-requirement">${tactic.requirement}</div>
                </div>
                <div class="tactic-card-actions">
                    <button class="tactic-action-btn keep-btn" data-action="keep">Keep</button>
                    <button class="tactic-action-btn bin-btn" data-action="discard">Discard</button>
                </div>
            `;
            
            // Add event listeners for action buttons
            const keepBtn = cardElement.querySelector('.keep-btn');
            const discardBtn = cardElement.querySelector('.bin-btn');
            
            keepBtn.addEventListener('click', () => handleCardManagementAction(cardNumber, 'keep', cardElement));
            discardBtn.addEventListener('click', () => handleCardManagementAction(cardNumber, 'discard', cardElement));
            
            cardManagementCards.appendChild(cardElement);
        });
        
        // Show modal
        cardDrawingModal.style.display = 'flex';
    }
    
    function handleCardManagementAction(cardNumber, action, cardElement) {
        if (action === 'keep') {
            setCardStatus(cardNumber, 'Kept');
        } else if (action === 'discard') {
            setCardStatus(cardNumber, 'Discarded');
        }
        
        cardElement.remove();
    }
    
    function confirmCardDrawing() {
        // Close card drawing modal
        cardDrawingModal.style.display = 'none';
        
        // Move to next round
        gameState.currentRound++;
        gameState.roundTurnsCompleted = 0; // Reset for new round
        
        // Draw new cards for the new round
        if (gameState.currentRound <= 4) {
            drawCardsForRound();
        }
        
        // Check if game is over
        if (gameState.currentRound > 4) {
            endGame();
            return;
        }
        
        // Show turn order selection for the new round
        showTurnOrderSelection();
    }

    // --- GAME FUNCTIONS ---
    function startGame() {
        gameState.isGameActive = true;
        gameState.currentRound = 1;
        gameState.currentPhase = 0;
        
        // Reset card system
        gameState.drawnCards = [];
        gameState.currentRoundCards = [];
        
        gameSetup.style.display = 'none';
        gameInProgress.style.display = 'flex';
        cardDisplay.style.display = 'block';
        
        // Draw cards for first round
        drawCardsForRound();
        
        updateGameDisplay();
        highlightCurrentPhase();
    }

    function nextPhase() {
        console.log('nextPhase called');
        console.log('Current phase before increment:', gameState.currentPhase);
        gameState.currentPhase++;
        console.log('Current phase after increment:', gameState.currentPhase);
        
        // Clean up effects that expire at phase change
        effectManager.cleanupExpiredEffects();
        
        // Update effect display for new phase
        effectManager.updateEffectDisplay();
        
        // If we've completed all phases for this turn
        if (gameState.currentPhase >= gameState.phases.length) {
            console.log('End of turn reached');
            console.log('gameState.currentPhase:', gameState.currentPhase);
            console.log('gameState.phases.length:', gameState.phases.length);
            console.log('gameState.currentTurn:', gameState.currentTurn);
            
            // Show scoring modal only on player turns
            if (gameState.currentTurn === 'player') {
                console.log('Calling showScoringModal for player turn');
                showScoringModal();
            } else {
                console.log('Enemy turn ended, continuing to next turn');
                // Enemy turn ended, continue to next turn (which will handle round end logic)
                continueToNextTurn();
            }
            return; // Don't continue until scoring is confirmed or we advanced turn
        }
        
        updateGameDisplay();
        highlightCurrentPhase();
    }
    
    	function continueToNextTurn() {
		// Increment turns completed in this round
		gameState.roundTurnsCompleted++;
		
		// Switch turns
		gameState.currentTurn = gameState.currentTurn === 'player' ? 'enemy' : 'player';
		gameState.currentPhase = 0;
		
		// Clean up effects that expire at turn change
		effectManager.cleanupExpiredEffects();
		
		// Reset per-turn ability usage
		resetAbilityUsage('per_turn');
		
		// Update effect display for new turn
		effectManager.updateEffectDisplay();
		
		// If we've completed 2 turns in this round, the round is over
		if (gameState.roundTurnsCompleted >= 2) {
			// Show card management modal for end of round
			showCardDrawingModal();
			return;
		}
		
		updateGameDisplay();
		highlightCurrentPhase();
	}

    function updateGameDisplay() {
        currentRoundSpan.textContent = gameState.currentRound;
        currentPhaseSpan.textContent = gameState.phaseNames[gameState.currentPhase];
        updateTurnDisplay();
        updateScoreDisplay();
        updateCurrentCardsDisplay();
    }
    
    function updateScoreDisplay() {
        // Calculate total score from all sources
        let totalScore = 0;
        let primaryScore = 0;
        let tacticScore = 0;
        
        // Add scored cards (battle tactics)
        gameState.scoredCards.forEach(cardId => {
            const card = gameState.battleTactics.find(c => c.cardNumber === cardId);
            if (card) {
                tacticScore += card.victoryPoints || 1; // Default to 1 VP if not specified
            }
        });
        
        // Add primary objectives from all completed rounds
        Object.values(gameState.scores.rounds).forEach(roundScore => {
            primaryScore += roundScore.primary || 0;
        });
        
        totalScore = primaryScore + tacticScore;
        
        console.log('Main page updateScoreDisplay - totalScore:', totalScore);
        console.log('Primary score:', primaryScore);
        console.log('Tactic score:', tacticScore);
        console.log('Scored cards:', gameState.scoredCards);
        console.log('Round scores:', gameState.scores.rounds);
        
        // Update main score display
        currentScoreSpan.textContent = totalScore;
        
        // Update breakdown displays
        const mainPrimaryScoreSpan = document.getElementById('main-primary-score');
        const mainTacticScoreSpan = document.getElementById('main-tactic-score');
        
        if (mainPrimaryScoreSpan) {
            mainPrimaryScoreSpan.textContent = primaryScore;
        }
        if (mainTacticScoreSpan) {
            mainTacticScoreSpan.textContent = tacticScore;
        }
    }
    
    function updateCurrentCardsDisplay() {
        if (gameState.currentRoundCards.length === 0) {
            currentCardsDisplay.innerHTML = '<div class="no-cards-message">No cards drawn yet</div>';
            return;
        }
        
        // Clear existing content
        currentCardsDisplay.innerHTML = '';
        
        gameState.currentRoundCards.forEach(cardId => {
            const card = gameState.battleTactics.find(c => c.cardNumber === cardId);
            if (!card) return;
            
            const status = gameState.cardStates[cardId] || 'Pending';
            const statusClass = status === 'Scored' ? 'scored' : status === 'Used' ? 'used' : 'active';
            
            const cardElement = document.createElement('div');
            cardElement.className = `current-card-item ${statusClass}`;
            cardElement.innerHTML = `
                <div class="card-number">${cardId}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-status">${status}</div>
            `;
            
            // Add click event listener
            cardElement.addEventListener('click', () => {
                showTacticDetails(cardId);
            });
            
            // Add cursor pointer style
            cardElement.style.cursor = 'pointer';
            
            currentCardsDisplay.appendChild(cardElement);
        });
    }
    
    function showAllCardsModal() {
        // Clear existing content
        allCardsGrid.innerHTML = '';
        
        // Display all battle tactics cards
        gameState.battleTactics.forEach(card => {
            const cardElement = document.createElement('div');
            
            // Determine card status
            let status = 'Not Drawn';
            let statusClass = 'not-drawn';
            let cardClass = 'library-card-item not-drawn';
            
            if (gameState.drawnCards.includes(card.cardNumber)) {
                status = gameState.cardStates[card.cardNumber] || 'Pending';
                statusClass = status.toLowerCase();
                cardClass = 'library-card-item';
            }
            
            cardElement.className = cardClass;
            cardElement.innerHTML = `
                <div class="library-card-header">
                    <div class="library-card-number">${card.cardNumber}</div>
                    <div class="library-card-status ${statusClass}">${status}</div>
                </div>
                <div class="library-card-name">${card.name}</div>
                <div class="library-card-description">${card.description}</div>
                <div class="library-card-requirement">${card.requirement}</div>
            `;
            
            // Add click event listener
            cardElement.addEventListener('click', () => {
                allCardsModal.style.display = 'none';
                showTacticDetails(card.cardNumber, allCardsModal);
            });
            
            allCardsGrid.appendChild(cardElement);
        });
        
        // Show the modal
        allCardsModal.style.display = 'flex';
    }

    function highlightCurrentPhase() {
        // Remove active class from all phases
        document.querySelectorAll('.phase-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Add active class to current phase
        const currentPhaseSection = document.querySelector(`[data-phase="${gameState.phases[gameState.currentPhase]}"]`);
        if (currentPhaseSection) {
            currentPhaseSection.classList.add('active');
            currentPhaseSection.open = true; // Open the current phase
        }
    }

    function endGame() {
        gameState.isGameActive = false;
        gameOverModal.style.display = 'flex';
    }

    	function resetGame() {
		gameState.isGameActive = false;
		gameState.currentRound = 1;
		gameState.currentTurn = 'player';
		gameState.startingPlayer = null;
		gameState.currentPhase = 0;
		
		// Reset card system
		gameState.drawnCards = [];
		gameState.currentRoundCards = [];
		gameState.cardsByRound = {};
		gameState.usedCards = [];
		gameState.keptCards = [];
		gameState.scoredCards = [];
		gameState.cardStates = {}; // Reset card status storage
		
		// Reset scoring system
		gameState.scores = {
			rounds: {},
			gameTotal: 0
		};
		
		gameSetup.style.display = 'block';
		gameInProgress.style.display = 'none';
		cardDisplay.style.display = 'none';
		        gameOverModal.style.display = 'none';
        tacticModal.style.display = 'none';
        scoringModal.style.display = 'none';
        cardDrawingModal.style.display = 'none';
		
		// Remove active highlighting
		document.querySelectorAll('.phase-section').forEach(section => {
			section.classList.remove('active');
		});
	}

    // --- TURN ORDER FUNCTIONS ---
    function showTurnOrderSelection() {
        // Update round number display
        roundNumberSpan.textContent = gameState.currentRound;
        
        // Show turn order selection
        turnOrderSelection.style.display = 'block';
        gameSetup.style.display = 'none';
        gameInProgress.style.display = 'none';
    }
    
    function startRoundWithTurnOrder(startingPlayer) {
        // Set the starting player for this round
        gameState.startingPlayer = startingPlayer;
        gameState.currentTurn = startingPlayer;
        gameState.roundTurnsCompleted = 0; // Reset turn counter for new round
        
        // Hide turn order selection
        turnOrderSelection.style.display = 'none';
        
        // Start the game/round
        if (!gameState.isGameActive) {
            startGame();
        } else {
            // Just update the display and continue with the existing round
            updateTurnDisplay();
            updateGameDisplay();
            highlightCurrentPhase();
            gameInProgress.style.display = 'block';
        }
    }
    
    
    function startGame() {
        gameState.isGameActive = true;
        gameState.currentRound = 1;
        gameState.currentPhase = 0;
        gameState.roundTurnsCompleted = 0;
        
        // Update display
        currentRoundSpan.textContent = gameState.currentRound;
        updateTurnDisplay();
        
        // Draw initial cards
        drawCardsForRound();
        
        // Show game in progress
        gameInProgress.style.display = 'block';
        
        // Update effect display when game starts
        effectManager.updateEffectDisplay();
    }
    
    function updateTurnDisplay() {
        if (gameState.currentTurn === 'player') {
            currentTurnSpan.textContent = 'Your Turn';
            turnIndicator.className = 'turn-indicator player-turn';
        } else {
            currentTurnSpan.textContent = 'Opponent\'s Turn';
            turnIndicator.className = 'turn-indicator enemy-turn';
        }
    }
    
    
    function endGame() {
        gameState.isGameActive = false;
        gameSetup.style.display = 'block';
        gameInProgress.style.display = 'none';
        turnOrderSelection.style.display = 'none';
        
        // Reset game state
        gameState.currentRound = 1;
        gameState.currentPhase = 0;
        gameState.currentTurn = 'player';
        gameState.startingPlayer = null;
        gameState.roundTurnsCompleted = 0;
        
        // Reset cards
        gameState.drawnCards = [];
        gameState.currentRoundCards = [];
        gameState.cardsByRound = {};
        gameState.usedCards = [];
        gameState.keptCards = [];
        gameState.scoredCards = [];
        gameState.cardStates = {};
        
        // Reset display
        currentRoundSpan.textContent = '1';
        updateTurnDisplay();
    }

    // --- EVENT LISTENERS ---
    startGameBtn.addEventListener('click', () => {
        // Show turn order selection for round 1
        showTurnOrderSelection();
    });
    
    // Turn order selection event listeners
    playerFirstBtn.addEventListener('click', () => {
        startRoundWithTurnOrder('player');
    });
    
    opponentFirstBtn.addEventListener('click', () => {
        startRoundWithTurnOrder('opponent');
    });
    
    toggleCardsBtn.addEventListener('click', toggleCardView);
    
    closeTacticBtn.addEventListener('click', () => {
        tacticModal.style.display = 'none';
        // Restore previous modal if it exists
        if (previousModal) {
            previousModal.style.display = 'flex';
            previousModal = null;
        }
    });
    
    useCommandBtn.addEventListener('click', () => {
        const cardNumber = parseInt(tacticModal.dataset.currentCard);
        const currentRoundCards = gameState.cardsByRound[gameState.currentRound] || [];
        if (cardNumber && currentRoundCards.includes(cardNumber) && getCardStatus(cardNumber) === 'Pending') {
            // Mark card as used using the new status system
            setCardStatus(cardNumber, 'Used');
            useCommandBtn.textContent = 'Command Used';
            useCommandBtn.disabled = true;
            
            // Update the card display to show it as used
            if (showingAllCards) {
                displayAllDrawnCards();
            } else {
                displayCurrentCards();
            }
        }
    });

    yourTurnBtn.addEventListener('click', () => {
        gameState.currentTurn = 'player';
        gameState.startingPlayer = 'player';
        turnModal.style.display = 'none';
        startGame();
    });

    enemyTurnBtn.addEventListener('click', () => {
        gameState.currentTurn = 'enemy';
        gameState.startingPlayer = 'enemy';
        turnModal.style.display = 'none';
        startGame();
    });

    nextPhaseBtn.addEventListener('click', nextPhase);

    endGameBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to end the game?')) {
            endGame();
        }
    });
    
    viewAllCardsBtn.addEventListener('click', () => {
        showAllCardsModal();
    });

    newGameBtn.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        resetGame();
    });

    closeGameBtn.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === turnModal) {
            turnModal.style.display = 'none';
        }
        if (event.target === gameOverModal) {
            gameOverModal.style.display = 'none';
        }
        if (event.target === tacticModal) {
            tacticModal.style.display = 'none';
            // Restore previous modal if it exists
            if (previousModal) {
                previousModal.style.display = 'flex';
                previousModal = null;
            }
        }
        if (event.target === scoringModal) {
            scoringModal.style.display = 'none';
        }
        if (event.target === cardDrawingModal) {
            cardDrawingModal.style.display = 'none';
        }
    });
    
    // Confirm scoring button
    confirmScoringBtn.addEventListener('click', confirmScoring);
    
    // Confirm card drawing button
    confirmCardDrawingBtn.addEventListener('click', confirmCardDrawing);

}); 