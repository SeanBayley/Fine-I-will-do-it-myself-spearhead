// JavaScript code will go here 

document.addEventListener('DOMContentLoaded', () => {
    const factionSelect = document.getElementById('faction-select');
    const factionRulesSection = document.getElementById('faction-rules');

    // Get containers
    const armyRulesContainer = document.getElementById('army-rules');
    const regimentAbilityContainer = document.getElementById('regiment-ability-selection'); // New container
    const enhancementSelectionContainer = document.getElementById('enhancement-selection'); // New/Renamed container
    const compositionContainer = document.getElementById('spearhead-composition'); // *** NEW ***
    const mainContinueButton = document.getElementById('faction-rules-continue'); // Get the main button

    // Session Storage Keys
    const FACTION_KEY = 'selectedFaction';
    const ABILITY_KEY = 'selectedAbility';
    const ENHANCEMENT_KEY = 'selectedEnhancement';

    // --- Helper function to check if both selections are made ---
    function checkSelectionsComplete() {
        const selectedAbility = regimentAbilityContainer.querySelector('input[name="regiment-ability-selection"]:checked');
        const selectedEnhancement = enhancementSelectionContainer.querySelector('input[name="enhancement-selection"]:checked');

        if (selectedAbility && selectedEnhancement) {
            mainContinueButton.style.display = 'block'; // Or 'inline-block'
            mainContinueButton.disabled = false;
        } else {
            mainContinueButton.style.display = 'none';
            mainContinueButton.disabled = true;
        }
    }

    // --- Helper function to display Army Rules (Reverted to list) ---
    function displayArmyRules(rules, container) {
        container.innerHTML = '<h3>Army Rules</h3>'; // Clear previous content and add title
        if (!rules || rules.length === 0) {
            container.innerHTML += '<p>No army rules found for this faction.</p>';
            return;
        }
        const list = document.createElement('ul');
        rules.forEach(rule => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <h4>${rule.name} ${rule.type ? `(${rule.type})` : ''}</h4>
                ${rule.timing ? `<p><strong>Timing:</strong> ${rule.timing}</p>` : ''}
                ${rule.frequency ? `<p><strong>Frequency:</strong> ${rule.frequency}</p>` : ''}
                <p>${rule.description}</p>
            `;
            list.appendChild(listItem);
        });
        container.appendChild(list);
    }

    // --- New Helper function to display Regiment Ability Selection ---
    function displayRegimentAbilitySelection(abilities, container) {
        const title = container.querySelector('h3');

        let selectionArea = container.querySelector('.rule-selection-area');
        if (selectionArea) {
            selectionArea.innerHTML = '';
        } else {
            selectionArea = document.createElement('div');
            selectionArea.className = 'rule-selection-area';
            container.appendChild(selectionArea); // Append directly
        }

        if (!abilities || abilities.length === 0) {
            selectionArea.innerHTML = '<p>No regiment abilities found.</p>';
            title.textContent = 'Regiment Ability';
            return;
        } else {
            title.textContent = 'Regiment Ability (Select One)';
        }

        abilities.forEach((ability, index) => {
            const ruleBox = document.createElement('div');
            ruleBox.className = 'rule-box';

            const inputId = `reg-ability-${index}`;
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.id = inputId;
            radioInput.name = 'regiment-ability-selection';
            radioInput.value = ability.name;

            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.innerHTML = `
                <h4>${ability.name}</h4>
                ${ability.timing ? `<p><strong>Timing:</strong> ${ability.timing}</p>` : ''}
                ${ability.frequency ? `<p><strong>Frequency:</strong> ${ability.frequency}</p>` : ''}
                <p>${ability.description}</p>
            `;

            radioInput.addEventListener('change', () => {
                if (radioInput.checked) {
                    // Highlight selected box
                    container.querySelectorAll('.rule-box').forEach(box => box.classList.remove('selected'));
                    ruleBox.classList.add('selected');
                    // *** Store selection ***
                    sessionStorage.setItem(ABILITY_KEY, radioInput.value);
                    checkSelectionsComplete(); 
                }
            });

            ruleBox.addEventListener('click', () => {
                if (!radioInput.checked) {
                    radioInput.checked = true;
                    const changeEvent = new Event('change');
                    radioInput.dispatchEvent(changeEvent);
                }
            });

            ruleBox.appendChild(radioInput);
            ruleBox.appendChild(label);
            selectionArea.appendChild(ruleBox);
        });
    }

    // --- New Helper function to display Enhancement Selection ---
    function displayEnhancementSelection(enhancements, container) {
        const title = container.querySelector('h3');

        let selectionArea = container.querySelector('.rule-selection-area');
        if (selectionArea) {
            selectionArea.innerHTML = '';
        } else {
            selectionArea = document.createElement('div');
            selectionArea.className = 'rule-selection-area';
            container.appendChild(selectionArea); // Append directly
        }

        if (!enhancements || enhancements.length === 0) {
            selectionArea.innerHTML = '<p>No enhancements found.</p>';
            title.textContent = 'Enhancement';
            return;
        } else {
            title.textContent = 'Enhancement (Select One Artefact of Power)';
        }

        enhancements.forEach((enhancement, index) => {
            const ruleBox = document.createElement('div');
            ruleBox.className = 'rule-box';

            const inputId = `enhancement-${index}`;
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.id = inputId;
            radioInput.name = 'enhancement-selection';
            radioInput.value = enhancement.name;

            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.innerHTML = `
                <h4>${enhancement.name} ${enhancement.type ? `(${enhancement.type})` : ''}</h4>
                ${enhancement.timing ? `<p><strong>Timing:</strong> ${enhancement.timing}</p>` : ''}
                ${enhancement.frequency && enhancement.frequency !== 'N/A' ? `<p><strong>Frequency:</strong> ${enhancement.frequency}</p>` : ''} 
                <p>${enhancement.description}</p>
            `;

            radioInput.addEventListener('change', () => {
                if (radioInput.checked) {
                    // Highlight selected box
                    container.querySelectorAll('.rule-box').forEach(box => box.classList.remove('selected'));
                    ruleBox.classList.add('selected');
                    // *** Store selection ***
                    sessionStorage.setItem(ENHANCEMENT_KEY, radioInput.value);
                    checkSelectionsComplete();
                }
            });

            ruleBox.addEventListener('click', () => {
                 if (!radioInput.checked) {
                    radioInput.checked = true;
                    const changeEvent = new Event('change');
                    radioInput.dispatchEvent(changeEvent);
                 }
            });

            ruleBox.appendChild(radioInput);
            ruleBox.appendChild(label);
            selectionArea.appendChild(ruleBox);
        });
    }

    // --- NEW: Helper function to display Spearhead Composition ---
    function displayComposition(composition, container) {
        container.innerHTML = '<h3>Spearhead Composition</h3>'; // Clear and add title
        if (!composition || composition.length === 0) {
            container.innerHTML += '<p>Composition not specified for this faction.</p>';
            return;
        }
        const list = document.createElement('ul');
        composition.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            list.appendChild(listItem);
        });
        container.appendChild(list);
    }

    // --- NEW: Function to Load and Display Faction Data ---
    function loadAndDisplayFaction(selectedDataFile) {
        // Reset body class
        document.body.className = ''; // Remove previous faction classes

        // *** Store selected faction (if valid) and clear related choices ***
        if (selectedDataFile) {
             sessionStorage.setItem(FACTION_KEY, selectedDataFile);
        } else {
             sessionStorage.removeItem(FACTION_KEY);
        }
        // Clear these *before* loading new data to ensure we only restore if applicable
        // We re-save them later when user explicitly clicks
        // Although, for restore-on-back, we rely on what was already saved.
        // Let's clear them only if the user *manually* selects "--Please choose..." 
        // OR if the load fails for a restored selection.
        // We will clear them inside the display functions based on user interaction.
        // For now, only clear if selectedDataFile is empty. 
        if (!selectedDataFile) {
             sessionStorage.removeItem(ABILITY_KEY);
             sessionStorage.removeItem(ENHANCEMENT_KEY);
        }
        // ********************************************************

        // Reset areas when changing selection or selecting default
        displayArmyRules([], armyRulesContainer);
        displayComposition([], compositionContainer); // *** NEW: Reset composition ***
        displayRegimentAbilitySelection([], regimentAbilityContainer);
        displayEnhancementSelection([], enhancementSelectionContainer);
        factionRulesSection.style.display = 'none';
        mainContinueButton.style.display = 'none';
        mainContinueButton.disabled = true;

        if (!selectedDataFile) {
            return; // Exit if no faction is selected
        }

        console.log(`Loading data for: ${selectedDataFile}`);
        // Fetch the selected faction's data
        fetch(selectedDataFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(factionData => {
                console.log('Fetched faction data:', factionData);

                // *** ADD FACTION CLASS TO BODY ***
                if (factionData.factionId) {
                    document.body.classList.add(factionData.factionId);
                }
                // ********************************

                // Show relevant sections
                factionRulesSection.style.display = 'block';

                // Populate HTML with fetched data
                displayArmyRules(factionData.armyRules, armyRulesContainer);
                displayComposition(factionData.spearheadComposition, compositionContainer); // *** NEW: Display composition ***
                displayRegimentAbilitySelection(factionData.regimentAbilities, regimentAbilityContainer);
                displayEnhancementSelection(factionData.enhancements, enhancementSelectionContainer);

                // *** Restore Ability/Enhancement Selections ***
                const storedAbility = sessionStorage.getItem(ABILITY_KEY);
                const storedEnhancement = sessionStorage.getItem(ENHANCEMENT_KEY);

                if (storedAbility) {
                    const abilityRadio = regimentAbilityContainer.querySelector(`input[name="regiment-ability-selection"][value="${CSS.escape(storedAbility)}"]`);
                    if (abilityRadio) {
                        abilityRadio.checked = true;
                        abilityRadio.closest('.rule-box')?.classList.add('selected');
                         console.log('Restored ability:', storedAbility);
                    } else {
                         console.warn('Stored ability not found for this faction, clearing:', storedAbility);
                         sessionStorage.removeItem(ABILITY_KEY); // Clear if invalid for this faction
                    }
                }
                if (storedEnhancement) {
                    const enhancementRadio = enhancementSelectionContainer.querySelector(`input[name="enhancement-selection"][value="${CSS.escape(storedEnhancement)}"]`);
                    if (enhancementRadio) {
                        enhancementRadio.checked = true;
                        enhancementRadio.closest('.rule-box')?.classList.add('selected');
                         console.log('Restored enhancement:', storedEnhancement);
                    } else {
                         console.warn('Stored enhancement not found for this faction, clearing:', storedEnhancement);
                         sessionStorage.removeItem(ENHANCEMENT_KEY); // Clear if invalid for this faction
                    }
                }
                // Update button state after restoring
                checkSelectionsComplete(); 
                // *******************************************
            })
            .catch(error => {
                console.error('Error loading faction data:', error);
                // Display error messages
                armyRulesContainer.innerHTML = '<h3>Army Rules</h3><p>Error loading data.</p>';
                compositionContainer.innerHTML = '<h3>Spearhead Composition</h3><p>Error loading data.</p>'; // *** NEW: Error message ***
                regimentAbilityContainer.innerHTML = '<h3>Regiment Ability</h3><p>Error loading data.</p>';
                enhancementSelectionContainer.innerHTML = '<h3>Enhancement</h3><p>Error loading data.</p>';
                factionRulesSection.style.display = 'block'; 
                 // Clear stored selections if loading failed for the restored faction
                 sessionStorage.removeItem(ABILITY_KEY);
                 sessionStorage.removeItem(ENHANCEMENT_KEY);
            });
    }
    // --- END loadAndDisplayFaction ---

    // Fetch the list of factions and populate the dropdown
    fetch('data/manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(manifest => {
            manifest.factions.forEach(faction => {
                const option = document.createElement('option');
                option.value = faction.dataFile;
                option.textContent = faction.name;
                factionSelect.appendChild(option);
            });

            // *** Restore faction selection after populating dropdown ***
            const storedFaction = sessionStorage.getItem(FACTION_KEY);
            if (storedFaction && Array.from(factionSelect.options).some(opt => opt.value === storedFaction)) {
                 console.log('Restoring faction:', storedFaction);
                 factionSelect.value = storedFaction;
                 // *** Directly call loading function ***
                 loadAndDisplayFaction(storedFaction);
             } else {
                 sessionStorage.removeItem(FACTION_KEY); // Clear if invalid
             }
        })
        .catch(error => {
            console.error('Error loading faction list:', error);
            factionSelect.disabled = true;
            factionSelect.innerHTML = '<option>Error loading factions</option>';
        });

    // Add event listener to handle faction selection (UPDATED CALLS)
    factionSelect.addEventListener('change', (event) => {
        loadAndDisplayFaction(event.target.value);
    });

    // --- Main Continue Button Event Listener (MODIFIED) ---
    mainContinueButton.addEventListener('click', () => {
        const selectedAbilityRadio = regimentAbilityContainer.querySelector('input[name="regiment-ability-selection"]:checked');
        const selectedEnhancementRadio = enhancementSelectionContainer.querySelector('input[name="enhancement-selection"]:checked');
        const selectedFactionDataFile = factionSelect.value; // Get selected faction file path

        if (selectedAbilityRadio && selectedEnhancementRadio && selectedFactionDataFile) {
             const selectedAbility = selectedAbilityRadio.value;
             const selectedEnhancement = selectedEnhancementRadio.value;
             console.log(`Selected Regiment Ability: ${selectedAbility}`);
             console.log(`Selected Enhancement: ${selectedEnhancement}`);
             console.log(`Navigating to units page for: ${selectedFactionDataFile}`);

             // Navigate to units.html, passing the data file path
             // We also pass the selected ability/enhancement if needed later
             window.location.href = `units.html?faction=${encodeURIComponent(selectedFactionDataFile)}&ability=${encodeURIComponent(selectedAbility)}&enhancement=${encodeURIComponent(selectedEnhancement)}`;

        } else {
            console.error('Error: Continue button clicked but selections not complete or faction not selected.');
        }
    });
}); 