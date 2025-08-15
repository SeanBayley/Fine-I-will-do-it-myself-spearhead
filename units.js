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
        // Card system
        allCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        drawnCards: [],
        currentRoundCards: [],
        cardsByRound: {}, // Track which cards were drawn in which round
        usedCards: [], // Track which cards have been used
        keptCards: [], // Track which cards are kept for next round
        scoredCards: [], // Track which cards have been scored
        battleTactics: [], // Will store battle tactics data
        // Scoring system
        scores: {
            rounds: {}, // Store scores for each round
            gameTotal: 0
        }
    };

    // --- GAME CONTROLS ---
    const startGameBtn = document.getElementById('start-game-btn');
    const gameSetup = document.getElementById('game-setup');
    const gameInProgress = document.getElementById('game-in-progress');
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    const endGameBtn = document.getElementById('end-game-btn');
    const currentTurnSpan = document.getElementById('current-turn');
    const currentRoundSpan = document.getElementById('current-round');
    const turnIndicator = document.querySelector('.turn-indicator');
    
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
    
    function drawCardsForRound() {
        // Start with kept cards from previous round
        const cardsForThisRound = [...gameState.keptCards];
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
        }
        
        // Track which round these cards were drawn in
        gameState.cardsByRound[gameState.currentRound] = cardsForThisRound;
        gameState.currentRoundCards = cardsForThisRound;
        displayCurrentCards();
    }
    
    function displayCurrentCards() {
        currentCards.innerHTML = '';
        
        if (gameState.currentRoundCards.length === 0) {
            currentCards.innerHTML = '<p style="color: white; font-style: italic;">No cards drawn for this round</p>';
            return;
        }
        
        gameState.currentRoundCards.forEach(cardNumber => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.cardNumber = cardNumber;
            
            // Check if card has been used or scored
            if (gameState.usedCards.includes(cardNumber)) {
                cardElement.classList.add('used');
            } else if (gameState.scoredCards.includes(cardNumber)) {
                cardElement.classList.add('scored');
            }
            
            // Find the battle tactic for this card
            const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
            if (tactic) {
                // Display the tactic name
                cardElement.textContent = tactic.name;
                cardElement.title = `${tactic.name}: ${tactic.requirement}`; // Show name and requirement on hover
            } else {
                cardElement.textContent = cardNumber;
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
                
                // Check if card has been used or scored
                if (gameState.usedCards.includes(cardNumber)) {
                    cardElement.classList.add('used');
                } else if (gameState.scoredCards.includes(cardNumber)) {
                    cardElement.classList.add('scored');
                }
                
                // Find the battle tactic for this card
                const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
                if (tactic) {
                    // Display the tactic name
                    cardElement.textContent = tactic.name;
                    cardElement.title = `${tactic.name}: ${tactic.requirement}`; // Show name and requirement on hover
                } else {
                    cardElement.textContent = cardNumber;
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
    
    function showTacticDetails(cardNumber) {
        const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
        if (!tactic) return;
        
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
        
        // Check if card is from current round and not used/scored
        const isCurrentRoundCard = gameState.currentRoundCards.includes(cardNumber);
        const isUsed = gameState.usedCards.includes(cardNumber);
        const isScored = gameState.scoredCards.includes(cardNumber);
        
        if (!isCurrentRoundCard) {
            useCommandBtn.textContent = 'Not Current Round';
            useCommandBtn.disabled = true;
        } else if (isUsed) {
            useCommandBtn.textContent = 'Command Used';
            useCommandBtn.disabled = true;
        } else if (isScored) {
            useCommandBtn.textContent = 'Card Scored';
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
    // Configuration for the currently open scoring modal
    let currentScoringConfig = { showModal: true, showPrimary: true, allowedActions: ['keep', 'score', 'bin'] };
    
    function determineScoringModalConfig() {
        const starting = gameState.startingPlayer || 'player';
        const isPlayerTurn = gameState.currentTurn === 'player';
        // 4 modes derived from starting player and whose turn it is
        // - Player starts, end of player's turn: show primary, actions [score, keep]
        // - Player starts, end of enemy's turn: hide primary, actions [keep, bin]
        // - Enemy starts, end of enemy's turn: no modal
        // - Enemy starts, end of player's turn: show primary, actions [score, bin, keep]
        if (starting === 'player') {
            if (isPlayerTurn) {
                return { showModal: true, showPrimary: true, allowedActions: ['score', 'keep'] };
            } else {
                return { showModal: true, showPrimary: false, allowedActions: ['keep', 'bin'] };
            }
        } else {
            if (!isPlayerTurn) {
                return { showModal: false, showPrimary: false, allowedActions: [] };
            } else {
                return { showModal: true, showPrimary: true, allowedActions: ['score', 'bin', 'keep'] };
            }
        }
    }
    
    function showScoringModal(config) {
        // Determine config and store it for score calculations
        currentScoringConfig = config || determineScoringModalConfig();
        
        // Show/hide primary objectives section based on config
        const primaryObjectivesSection = document.querySelector('.scoring-section:first-child');
        if (primaryObjectivesSection) {
            primaryObjectivesSection.style.display = currentScoringConfig.showPrimary ? 'block' : 'none';
        }
        
        // Reset primary checkboxes only if showing primary
        if (currentScoringConfig.showPrimary) {
            document.getElementById('primary-1').checked = false;
            document.getElementById('primary-2').checked = false;
            document.getElementById('primary-3').checked = false;
        }
        
        // Clear previous battle tactics
        battleTacticsScoring.innerHTML = '';
        
        // Get available battle tactics (not used as commands)
        const availableTactics = gameState.currentRoundCards.filter(cardNumber => 
            !gameState.usedCards.includes(cardNumber)
        );
        
        // Create battle tactic cards for scoring
        availableTactics.forEach(cardNumber => {
            const tactic = gameState.battleTactics.find(t => t.cardNumber === cardNumber);
            if (!tactic) return;
            
            const tacticCard = document.createElement('div');
            tacticCard.className = 'tactic-scoring-card';
            tacticCard.dataset.cardNumber = cardNumber;
            
            // Build buttons based on allowed actions
            let actionButtons = '';
            currentScoringConfig.allowedActions.forEach(action => {
                if (action === 'keep') {
                    actionButtons += '<button class="tactic-action-btn keep-btn" data-action="keep">Keep<\/button>';
                } else if (action === 'score') {
                    actionButtons += '<button class="tactic-action-btn score-btn" data-action="score">Score<\/button>';
                } else if (action === 'bin') {
                    actionButtons += '<button class="tactic-action-btn bin-btn" data-action="bin">Bin<\/button>';
                }
            });
            
            tacticCard.innerHTML = `
                <div class="tactic-card-info">
                    <div class="tactic-card-name">${tactic.name}</div>
                    <div class="tactic-card-requirement">${tactic.requirement}</div>
                </div>
                <div class="tactic-card-actions">
                    ${actionButtons}
                </div>
            `;
            
            // Add event listeners for action buttons
            const actionButtonElements = tacticCard.querySelectorAll('.tactic-action-btn');
            actionButtonElements.forEach(btn => {
                btn.addEventListener('click', () => handleTacticAction(cardNumber, btn.dataset.action, tacticCard));
            });
            
            battleTacticsScoring.appendChild(tacticCard);
        });
        
        // Add event listeners for primary objective checkboxes only if showing them
        if (currentScoringConfig.showPrimary) {
            document.getElementById('primary-1').addEventListener('change', updateScoreDisplay);
            document.getElementById('primary-2').addEventListener('change', updateScoreDisplay);
            document.getElementById('primary-3').addEventListener('change', updateScoreDisplay);
        }
        
        // Initialize score display
        updateScoreDisplay();
        
        // Update the round title to show whose turn it is
        const scoringRoundTitle = document.getElementById('scoring-round-title');
        if (scoringRoundTitle) {
            const turnText = gameState.currentTurn === 'player' ? 'Your Turn' : 'Enemy Turn';
            scoringRoundTitle.textContent = `Score Round ${gameState.currentRound} - ${turnText}`;
        }
        
        // Show modal
        scoringModal.style.display = 'flex';
    }
    
    function handleTacticAction(cardNumber, action, tacticCard) {
        switch (action) {
            case 'keep':
                if (!gameState.keptCards.includes(cardNumber)) {
                    gameState.keptCards.push(cardNumber);
                }
                // Remove from current round cards so it is not offered again this round
                {
                    const idx = gameState.currentRoundCards.indexOf(cardNumber);
                    if (idx > -1) gameState.currentRoundCards.splice(idx, 1);
                }
                tacticCard.remove();
                break;
            case 'score':
                // Add to scored cards for the current round
                gameState.scoredCards.push(cardNumber);
                if (!gameState.scores.rounds[gameState.currentRound]) {
                    gameState.scores.rounds[gameState.currentRound] = {
                        primary: 0,
                        tactics: 0,
                        total: 0
                    };
                }
                gameState.scores.rounds[gameState.currentRound].tactics++;
                // Remove from current round cards since it's been scored
                const scoreCardIndex = gameState.currentRoundCards.indexOf(cardNumber);
                if (scoreCardIndex > -1) {
                    gameState.currentRoundCards.splice(scoreCardIndex, 1);
                }
                tacticCard.remove();
                break;
            case 'bin':
                // Remove from current round cards (discard)
                const cardIndex = gameState.currentRoundCards.indexOf(cardNumber);
                if (cardIndex > -1) {
                    gameState.currentRoundCards.splice(cardIndex, 1);
                }
                tacticCard.remove();
                break;
        }
        
        updateScoreDisplay();
    }
    
    function updateScoreDisplay() {
        // Calculate primary score depending on visibility
        const existingRoundScore = gameState.scores.rounds[gameState.currentRound] || { primary: 0, tactics: 0, total: 0 };
        let primaryScore = 0;
        if (currentScoringConfig && currentScoringConfig.showPrimary) {
            if (document.getElementById('primary-1').checked) primaryScore++;
            if (document.getElementById('primary-2').checked) primaryScore++;
            if (document.getElementById('primary-3').checked) primaryScore++;
        } else {
            // Preserve existing recorded primary when primary section is hidden
            primaryScore = existingRoundScore.primary || 0;
        }
        
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
        primaryScoreSpan.textContent = primaryScore;
        tacticScoreSpan.textContent = tacticScore;
        roundTotalSpan.textContent = roundTotal;
        gameTotalSpan.textContent = gameTotal;
    }
    
    function confirmScoring() {
        // Calculate final scores for this round
        const existingRoundScore = gameState.scores.rounds[gameState.currentRound] || { primary: 0, tactics: 0, total: 0 };
        let primaryScore = 0;
        if (currentScoringConfig && currentScoringConfig.showPrimary) {
            if (document.getElementById('primary-1').checked) primaryScore++;
            if (document.getElementById('primary-2').checked) primaryScore++;
            if (document.getElementById('primary-3').checked) primaryScore++;
        } else {
            // Preserve existing primary when no primary scoring this modal
            primaryScore = existingRoundScore.primary || 0;
        }
        
        const tacticScore = (gameState.scores.rounds[gameState.currentRound] || { tactics: 0 }).tactics;
        const roundTotal = primaryScore + tacticScore;
        
        // Store the round scores (preserving or setting values)
        gameState.scores.rounds[gameState.currentRound] = {
            primary: primaryScore,
            tactics: tacticScore,
            total: roundTotal
        };
        
        // Update game total
        gameState.scores.gameTotal = Object.values(gameState.scores.rounds).reduce((sum, round) => sum + round.total, 0);
        
        // Close modal
        scoringModal.style.display = 'none';
        
        // Continue to next turn
        continueToNextTurn();
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
        gameState.currentPhase++;
        
        // If we've completed all phases for this turn
        if (gameState.currentPhase >= gameState.phases.length) {
            // Decide whether to show the scoring modal based on turn order
            const config = determineScoringModalConfig();
            if (config.showModal) {
                showScoringModal(config);
            } else {
                // Skip modal and proceed directly to next turn
                continueToNextTurn();
            }
            return; // Don't continue until scoring is confirmed or we advanced turn
        }
        
        updateGameDisplay();
        highlightCurrentPhase();
    }
    
    	function continueToNextTurn() {
		// Switch turns
		gameState.currentTurn = gameState.currentTurn === 'player' ? 'enemy' : 'player';
		gameState.currentPhase = 0;
		
		// If we are returning to the starting player, a new round begins
		if (gameState.startingPlayer && gameState.currentTurn === gameState.startingPlayer) {
			gameState.currentRound++;
			
			// Draw new cards for the new round
			if (gameState.currentRound <= 4) {
				drawCardsForRound();
			}
			
			// Check if game is over
			if (gameState.currentRound > 4) {
				endGame();
				return;
			}
		}
		
		updateGameDisplay();
		highlightCurrentPhase();
	}

    function updateGameDisplay() {
        currentTurnSpan.textContent = gameState.currentTurn === 'player' ? 'Your Turn' : 'Enemy Turn';
        currentRoundSpan.textContent = gameState.currentRound;
        
        // Update turn indicator styling
        if (gameState.currentTurn === 'enemy') {
            turnIndicator.classList.add('enemy-turn');
        } else {
            turnIndicator.classList.remove('enemy-turn');
        }
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
		
		// Remove active highlighting
		document.querySelectorAll('.phase-section').forEach(section => {
			section.classList.remove('active');
		});
	}

    // --- EVENT LISTENERS ---
    startGameBtn.addEventListener('click', () => {
        turnModal.style.display = 'flex';
    });
    
    toggleCardsBtn.addEventListener('click', toggleCardView);
    
    closeTacticBtn.addEventListener('click', () => {
        tacticModal.style.display = 'none';
    });
    
    useCommandBtn.addEventListener('click', () => {
        const cardNumber = parseInt(tacticModal.dataset.currentCard);
        if (cardNumber && gameState.currentRoundCards.includes(cardNumber) && !gameState.usedCards.includes(cardNumber) && !gameState.scoredCards.includes(cardNumber)) {
            gameState.usedCards.push(cardNumber);
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
            resetGame();
        }
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
        }
        if (event.target === scoringModal) {
            scoringModal.style.display = 'none';
        }
    });
    
    // Confirm scoring button
    confirmScoringBtn.addEventListener('click', confirmScoring);

}); 