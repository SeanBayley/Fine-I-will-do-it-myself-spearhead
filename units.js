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

                // Wrap name in span with data attributes
                cardHTML += `<li><span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ability.name)}</span></li>`; 
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
                     // Stormcast Specific Enhancements (Example)
                     if (factionData.factionId === 'stormcast-eternals') {
                        const targetUnitSCE = factionData.units.find(u => u.name === "Lord-Vigilant on Gryph-stalker");
                        if (targetUnitSCE) {
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
                                const targetWeapon = targetUnitSCE.meleeWeapons?.find(w => w.name === "Hallowed Greataxe");
                                if (targetWeapon) {
                                    if (!targetWeapon.abilities) {
                                        targetWeapon.abilities = []; // Ensure abilities array exists
                                    }
                                    // Avoid adding duplicates if somehow already present
                                    if (!targetWeapon.abilities.some(ab => ab.name === critMortalAbility.name)) {
                                         targetWeapon.abilities.push(critMortalAbility);
                                         console.log(`Applied Crit (Mortal) to ${targetUnitSCE.name}'s ${targetWeapon.name}`);
                                    }
                                }
                            } else if (selectedEnhancementNameForUnitMod === "Hallowed Scrolls") {
                                 if (!targetUnitSCE.abilities) {
                                    targetUnitSCE.abilities = []; // Ensure abilities array exists
                                 }
                                 // Avoid adding duplicates
                                 if (!targetUnitSCE.abilities.some(ab => ab.name === ward5Ability.name)) {
                                     targetUnitSCE.abilities.push(ward5Ability);
                                     console.log(`Applied Ward (5+) to ${targetUnitSCE.name}`);
                                 }
                            }
                        }
                     } 
                     // --- Skaven Specific Enhancements ---
                     else if (factionData.factionId === 'skaven') {
                         const targetUnitSkaven = factionData.units.find(u => u.name === "Clawlord on Gnaw-beast");
                         if (targetUnitSkaven) {
                             if (selectedEnhancementNameForUnitMod === "Skryre Connections") {
                                 const targetWeapon = targetUnitSkaven.rangedWeapons?.find(w => w.name === "Ratling Pistol");
                                 if (targetWeapon) {
                                     targetWeapon.attacks = "2D6";
                                     console.log(`Applied Skryre Connections: ${targetUnitSkaven.name}'s ${targetWeapon.name} attacks changed to ${targetWeapon.attacks}`);
                                 }
                             } else if (selectedEnhancementNameForUnitMod === "Cloak of Stitched Victories") {
                                 // Modify existing Ward ability
                                 const targetAbility = targetUnitSkaven.abilities?.find(ab => ab.name === "Ward (6+)");
                                 if (targetAbility) {
                                     targetAbility.name = "Ward (5+)";
                                     targetAbility.description = "Roll a dice each time a wound or mortal wound is allocated to this unit. On a 5+, that wound or mortal wound is negated.";
                                     console.log(`Applied Cloak of Stitched Victories: ${targetUnitSkaven.name}'s ability changed to ${targetAbility.name}`);
                                 }
                                 // Modify keyword
                                 const keywordIndex = targetUnitSkaven.keywords?.indexOf("WARD (6+)");
                                 if (keywordIndex !== -1 && targetUnitSkaven.keywords) {
                                     targetUnitSkaven.keywords[keywordIndex] = "WARD (5+)";
                                     console.log(`Applied Cloak of Stitched Victories: ${targetUnitSkaven.name}'s keyword changed to WARD (5+)`);
                                 }
                             }
                         }
                     }
                     // --- End Skaven Specific Enhancements ---
                     // --- Seraphon Specific Enhancements ---
                     else if (factionData.factionId.trim() === 'seraphon') { // Added .trim() here for safety
                         const targetUnitSeraphon = factionData.units.find(u => u.name === "Saurus Oldblood on Carnosaur");
                         if (targetUnitSeraphon) {
                            if (selectedEnhancementNameForUnitMod === "BLADE OF REALITIES") {
                                const targetWeapon = targetUnitSeraphon.meleeWeapons?.find(w => w.name === "Relic Celestite Weapon");
                                if (targetWeapon) {
                                     // Assuming rend is stored as a number or can be parsed
                                    const currentRend = parseInt(targetWeapon.rend); 
                                    if (!isNaN(currentRend)) {
                                         targetWeapon.rend = currentRend + 1;
                                         console.log(`Applied BLADE OF REALITIES: ${targetUnitSeraphon.name}'s ${targetWeapon.name} rend changed to ${targetWeapon.rend}`);
                                    } else {
                                        // Handle cases like "-" or if parsing fails
                                        console.warn(`Could not parse rend value '${targetWeapon.rend}' for ${targetWeapon.name} to apply BLADE OF REALITIES.`);
                                        // Optionally set to 1 if it was "-"? targetWeapon.rend = 1;
                                    }
                                }
                            } else if (selectedEnhancementNameForUnitMod === "THE WRATH OF CHOTEC") {
                                const targetWeapon = targetUnitSeraphon.rangedWeapons?.find(w => w.name === "Sunbolt Gauntlet");
                                if (targetWeapon) {
                                    targetWeapon.attacks = 6;
                                    console.log(`Applied THE WRATH OF CHOTEC: ${targetUnitSeraphon.name}'s ${targetWeapon.name} attacks changed to ${targetWeapon.attacks}`);
                                }
                            }
                         }
                     }
                     // --- End Seraphon Specific Enhancements ---
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

}); 