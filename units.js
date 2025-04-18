document.addEventListener('DOMContentLoaded', () => {
    const unitCardsContainer = document.getElementById('unit-cards-container');
    const factionNameHeader = document.getElementById('faction-name-header');

    // --- Function to get URL parameters ---
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // --- NEW Helper function to display a single Unit Card ---
    function displayUnitCard(unit, container) {
        const card = document.createElement('div');
        card.className = 'unit-card';

        let cardHTML = `<h3>${unit.name}</h3>`;

        // Stats
        if (unit.stats) {
            cardHTML += '<div class="stats-container">';
            const headers = Object.keys(unit.stats);
            headers.forEach(header => {
                 cardHTML += `<div class="stat-box"><span class="stat-label">${header.toUpperCase()}</span><span class="stat-value">${unit.stats[header]}</span></div>`;
            });
             // *** Add Unit Thumbnail Link ***
             if (unit.imageUrl) {
                cardHTML += 
                    `<a href="${escapeHtml(unit.imageUrl)}" target="_blank" class="unit-thumbnail-link" title="View larger image">` +
                    `<img src="${escapeHtml(unit.imageUrl)}" alt="${escapeHtml(unit.name)} Thumbnail" class="unit-thumbnail-image">` +
                    `</a>`;
            }
            // ****************************
            cardHTML += '</div>'; // Close stats-container
        }

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
                    abilitiesHTML = w.abilities.map(ab =>
                        `<span class="ability-name" data-tooltip="${escapeHtml(ab.description)}">${escapeHtml(ab.name)}</span>`
                    ).join(', ');
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
                    abilitiesHTML = w.abilities.map(ab =>
                        // Ensure escapeHtml is used for name *and* description
                        `<span class="ability-name" data-tooltip="${escapeHtml(ab.description)}">${escapeHtml(ab.name)}</span>`
                    ).join(', ');
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
                // Wrap name in span with tooltip data
                cardHTML += `<li><span class="ability-name" data-tooltip="${escapeHtml(ability.description)}">${ability.name}</span></li>`; 
                // Optionally, add timing/frequency info if needed:
                // cardHTML += `<li><span class="ability-name" data-tooltip="${escapeHtml(ability.description)}">${ability.name}</span> ${ability.timing ? `(${ability.timing})` : ''}</li>`;
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
                    // Escape the keyword itself in case it has special chars (unlikely but safe)
                    const escapedKeyword = escapeHtml(keyword);
                    // Escape the tooltip content
                    const escapedTooltip = escapeHtml(keywordTooltip);
                    return `<span class="ability-name" data-tooltip="${escapedTooltip}">${escapedKeyword}</span>`;
                } else {
                    return escapeHtml(keyword); // Escape other keywords too for safety
                }
            }).join(', '); // Join the processed keywords/spans
            cardHTML += `<p class="keywords-list">${keywordsHTML}</p>`;
            // --- END MODIFIED Keyword Rendering ---
        }

        card.innerHTML = cardHTML;
        container.appendChild(card);
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
                if (selectedEnhancementNameForUnitMod && factionData.units) {
                    const targetUnit = factionData.units.find(u => u.name === "Lord-Vigilant on Gryph-stalker");
                    if (targetUnit) {
                         // Define ability objects to add
                         const critMortalAbility = { 
                            name: "Crit (Mortal)", 
                            description: "If you roll a Critical Hit when attacking with this weapon, that attack inflicts mortal damage on the target equal to the weapon's Damage characteristic, instead of the normal damage." 
                        }; 
                        const ward5Ability = { 
                            name: "Ward (5+)", 
                            description: "For every point damage inflicted on this unit, roll a D6 and on a 5+ that damage is ignored",
                            timing: "Passive", 
                            type: "Enhancement Granted" 
                        }; 

                        if (selectedEnhancementNameForUnitMod === "Morrda's Talon") {
                            const targetWeapon = targetUnit.meleeWeapons?.find(w => w.name === "Hallowed Greataxe");
                            if (targetWeapon) {
                                if (!targetWeapon.abilities) {
                                    targetWeapon.abilities = []; // Ensure abilities array exists
                                }
                                // Avoid adding duplicates if somehow already present
                                if (!targetWeapon.abilities.some(ab => ab.name === critMortalAbility.name)) {
                                     targetWeapon.abilities.push(critMortalAbility);
                                     console.log(`Applied Crit (Mortal) to ${targetUnit.name}'s ${targetWeapon.name}`);
                                }
                            }
                        } else if (selectedEnhancementNameForUnitMod === "Hallowed Scrolls") {
                             if (!targetUnit.abilities) {
                                targetUnit.abilities = []; // Ensure abilities array exists
                             }
                             // Avoid adding duplicates
                             if (!targetUnit.abilities.some(ab => ab.name === ward5Ability.name)) {
                                 targetUnit.abilities.push(ward5Ability);
                                 console.log(`Applied Ward (5+) to ${targetUnit.name}`);
                             }
                        }
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
                } else {
                     unitCardsContainer.innerHTML = '<p>No units found for this faction.</p>';
                }

                // Populate Phase Rules (using potentially modified factionData)
                populatePhaseRules(factionData);

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
                        source: 'Enhancement'
                    });
                    enhancementAddedToPhase = true; // Mark that it was handled
                } else {
                    // Display separately if timing is passive/other
                    const enhancementDiv = document.createElement('div');
                    enhancementDiv.className = 'selected-enhancement-display';
                    enhancementDiv.innerHTML = `
                        <h4>Selected Enhancement</h4>
                        <p>
                            <span class="ability-name" data-tooltip="${escapeHtml(selectedEnhancement.description)}">${escapeHtml(selectedEnhancement.name)}</span>
                        </p>
                    `;
                    phaseColumn.querySelector('h2').insertAdjacentElement('afterend', enhancementDiv);
                }
            }
        }
        // -------------------------------------

        // --- Gather dynamic abilities by phase --- 
        // Army Rules
        if (factionData.armyRules) {
            factionData.armyRules.forEach(rule => {
                const phaseKey = getPhaseKey(rule.timing);
                if (phaseKey) {
                    phaseAbilities[phaseKey].push({ 
                        name: rule.name, 
                        description: rule.description, 
                        source: 'Army Rule' 
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
                             source: 'Regiment Ability' 
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
                                source: unit.name // Source is the unit name
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
                                          source: `${unit.name} (${weapon.name})` 
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
                                          source: `${unit.name} (${weapon.name})`
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
                        listItem.innerHTML = `
                            <span class="ability-name" data-tooltip="${escapeHtml(item.description)}">${escapeHtml(item.name)}</span>
                            <span class="ability-source">(${escapeHtml(item.source)})</span>
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

}); 