// Local 2-player setup: Ruleset → Side A → Side B → match.html
// Intentionally separate from script.js so solo index flow stays untouched.

document.addEventListener('DOMContentLoaded', () => {
    const factionGridContainer = document.getElementById('faction-grid');
    const factionRulesSection = document.getElementById('faction-rules');
    const armyRulesContainer = document.getElementById('army-rules');
    const regimentAbilityContainer = document.getElementById('regiment-ability-selection');
    const enhancementSelectionContainer = document.getElementById('enhancement-selection');
    const compositionContainer = document.getElementById('spearhead-composition');
    const mainContinueButton = document.getElementById('faction-rules-continue');
    const setupSideTitle = document.getElementById('setup-side-title');
    const factionRulesHeading = document.getElementById('faction-rules-heading');
    const stepIndicator = document.getElementById('setup-step-indicator');
    const rulesetSection = document.getElementById('ruleset-selection');
    const armySetupSection = document.getElementById('army-setup-section');
    const rulesetContinueBtn = document.getElementById('ruleset-continue-btn');

    const MATCH_SETUP_KEY = 'spearheadMatchSetup';
    const RULESET_LABELS = {
        'fire-and-jade': 'Fire and Jade',
        'city-of-ash': 'City of Ash',
        custom: 'Custom'
    };

    let currentStep = 'ruleset'; // ruleset | A | B
    let pendingSelection = { faction: null, ability: null, enhancement: null };
    let factionPickerApi = null;
    let matchSetup = loadMatchSetup();

    function loadMatchSetup() {
        try {
            const raw = sessionStorage.getItem(MATCH_SETUP_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    ruleset: parsed.ruleset || null,
                    sideA: parsed.sideA || null,
                    sideB: parsed.sideB || null
                };
            }
        } catch (err) {
            console.warn('Could not parse match setup from sessionStorage', err);
        }
        return { ruleset: null, sideA: null, sideB: null };
    }

    function saveMatchSetup() {
        sessionStorage.setItem(MATCH_SETUP_KEY, JSON.stringify(matchSetup));
        console.log('Saved match setup', matchSetup);
    }

    function getSelectedRuleset() {
        const checked = document.querySelector('input[name="ruleset"]:checked');
        return checked ? checked.value : null;
    }

    function updateStepChrome() {
        if (currentStep === 'ruleset') {
            rulesetSection.style.display = 'block';
            armySetupSection.style.display = 'none';
        } else {
            rulesetSection.style.display = 'none';
            armySetupSection.style.display = 'block';
            const sideLabel = currentStep === 'A' ? 'Side A' : 'Side B';
            setupSideTitle.textContent = `${sideLabel} — Select Faction & Spearhead`;
            factionRulesHeading.textContent = `${sideLabel} — Faction Rules`;
            mainContinueButton.textContent = currentStep === 'A'
                ? 'Continue to Side B'
                : 'Start Local Match';
        }

        stepIndicator.querySelectorAll('.setup-step').forEach((el) => {
            const step = el.dataset.step;
            const isActive = step === currentStep;
            const isDone =
                (currentStep === 'A' && step === 'ruleset') ||
                (currentStep === 'B' && (step === 'ruleset' || step === 'A'));
            el.classList.toggle('active', isActive);
            el.classList.toggle('done', isDone && !isActive);
            // Completed earlier steps are clickable so you can go back and reselect
            el.classList.toggle('is-clickable', isDone && !isActive);
            el.setAttribute('role', isDone && !isActive ? 'button' : 'presentation');
            el.tabIndex = isDone && !isActive ? 0 : -1;
        });
    }

    /** Navigate back to an earlier setup step (e.g. Side A while on Side B). */
    function goToSetupStep(targetStep) {
        const order = ['ruleset', 'A', 'B'];
        const currentIdx = order.indexOf(currentStep);
        const targetIdx = order.indexOf(targetStep);
        if (targetIdx < 0 || targetIdx >= currentIdx) return;

        if (targetStep === 'ruleset') {
            currentStep = 'ruleset';
            updateStepChrome();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('Returned to ruleset step');
            return;
        }

        if (targetStep === 'A') {
            // Invalidating Side B until Side A is confirmed again
            matchSetup.sideB = null;
            saveMatchSetup();
            currentStep = 'A';
            updateStepChrome();
            if (matchSetup.sideA?.faction) {
                restoreCommittedSide(matchSetup.sideA);
            } else {
                loadAndDisplayFaction(null);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('Returned to Side A for reselection');
        }
    }

    /** Reload a previously committed side so ability/enhancement can be changed. */
    function restoreCommittedSide(side) {
        loadAndDisplayFaction(side.faction, {
            ability: side.ability,
            enhancement: side.enhancement
        });
    }

    function selectRadioByValue(container, name, value) {
        if (!value) return;
        const input = container.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
        if (input) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

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

    function checkSelectionsComplete() {
        const selectedAbility = regimentAbilityContainer.querySelector('input[name="regiment-ability-selection"]:checked');
        const selectedEnhancement = enhancementSelectionContainer.querySelector('input[name="enhancement-selection"]:checked');

        if (selectedAbility && selectedEnhancement && pendingSelection.faction) {
            pendingSelection.ability = selectedAbility.value;
            pendingSelection.enhancement = selectedEnhancement.value;
            mainContinueButton.style.display = 'block';
            mainContinueButton.disabled = false;
        } else {
            mainContinueButton.style.display = 'none';
            mainContinueButton.disabled = true;
        }
    }

    function displayArmyRules(rules, container) {
        container.innerHTML = '<h3>Army Rules</h3>';
        if (!rules || rules.length === 0) {
            container.innerHTML += '<p>No army rules found for this faction.</p>';
            return;
        }
        const list = document.createElement('ul');
        rules.forEach((rule) => {
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

    function displayComposition(composition, container) {
        container.innerHTML = '<h3>Spearhead Composition</h3>';
        if (!composition || composition.length === 0) {
            container.innerHTML += '<p>Composition not specified for this faction.</p>';
            return;
        }
        const list = document.createElement('ul');
        composition.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            list.appendChild(listItem);
        });
        container.appendChild(list);
    }

    function displayRegimentAbilitySelection(abilities, container) {
        const title = container.querySelector('h3');
        let selectionArea = container.querySelector('.rule-selection-area');
        if (selectionArea) {
            selectionArea.innerHTML = '';
        } else {
            selectionArea = document.createElement('div');
            selectionArea.className = 'rule-selection-area';
            container.appendChild(selectionArea);
        }

        if (!abilities || abilities.length === 0) {
            selectionArea.innerHTML = '<p>No regiment abilities found.</p>';
            title.textContent = 'Regiment Ability';
            return;
        }
        title.textContent = 'Regiment Ability (Select One)';

        abilities.forEach((ability, index) => {
            const ruleBox = document.createElement('div');
            ruleBox.className = 'rule-box';

            const inputId = `reg-ability-${currentStep}-${index}`;
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
                    container.querySelectorAll('.rule-box').forEach((box) => box.classList.remove('selected'));
                    ruleBox.classList.add('selected');
                    pendingSelection.ability = radioInput.value;
                    checkSelectionsComplete();
                }
            });

            ruleBox.addEventListener('click', () => {
                if (!radioInput.checked) {
                    radioInput.checked = true;
                    radioInput.dispatchEvent(new Event('change'));
                }
            });

            ruleBox.appendChild(radioInput);
            ruleBox.appendChild(label);
            selectionArea.appendChild(ruleBox);
        });

        applyReveal(selectionArea, '.rule-box', 0, 80);
    }

    function displayEnhancementSelection(enhancements, container) {
        const title = container.querySelector('h3');
        let selectionArea = container.querySelector('.rule-selection-area');
        if (selectionArea) {
            selectionArea.innerHTML = '';
        } else {
            selectionArea = document.createElement('div');
            selectionArea.className = 'rule-selection-area';
            container.appendChild(selectionArea);
        }

        if (!enhancements || enhancements.length === 0) {
            selectionArea.innerHTML = '<p>No enhancements found.</p>';
            title.textContent = 'Enhancement';
            return;
        }
        title.textContent = 'Enhancement (Select One Artefact of Power)';

        enhancements.forEach((enhancement, index) => {
            const ruleBox = document.createElement('div');
            ruleBox.className = 'rule-box';

            const inputId = `enhancement-${currentStep}-${index}`;
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
                    container.querySelectorAll('.rule-box').forEach((box) => box.classList.remove('selected'));
                    ruleBox.classList.add('selected');
                    pendingSelection.enhancement = radioInput.value;
                    checkSelectionsComplete();
                }
            });

            ruleBox.addEventListener('click', () => {
                if (!radioInput.checked) {
                    radioInput.checked = true;
                    radioInput.dispatchEvent(new Event('change'));
                }
            });

            ruleBox.appendChild(radioInput);
            ruleBox.appendChild(label);
            selectionArea.appendChild(ruleBox);
        });

        applyReveal(selectionArea, '.rule-box', 0, 80);
    }

    function loadAndDisplayFaction(selectedDataFile, preselect = null) {
        document.body.className = '';
        pendingSelection = { faction: selectedDataFile || null, ability: null, enhancement: null };

        if (factionPickerApi) {
            factionPickerApi.setSelectedDataFile(selectedDataFile || null);
        }

        displayArmyRules([], armyRulesContainer);
        displayComposition([], compositionContainer);
        displayRegimentAbilitySelection([], regimentAbilityContainer);
        displayEnhancementSelection([], enhancementSelectionContainer);
        factionRulesSection.style.display = 'none';
        mainContinueButton.style.display = 'none';
        mainContinueButton.disabled = true;

        if (factionRulesHeading) {
            const sideLabel = currentStep === 'B' ? 'Side B' : 'Side A';
            factionRulesHeading.textContent = `${sideLabel} — Faction Rules`;
        }

        if (!selectedDataFile) return;

        console.log(`Match setup Side ${currentStep}: loading ${selectedDataFile}`);
        fetch(selectedDataFile)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then((factionData) => {
                if (factionData.factionId) {
                    document.body.classList.add(factionData.factionId);
                }
                if (factionRulesHeading) {
                    const sideLabel = currentStep === 'B' ? 'Side B' : 'Side A';
                    const title = factionData.spearheadName
                        ? `${sideLabel} — ${factionData.factionName} · ${factionData.spearheadName}`
                        : `${sideLabel} — ${factionData.factionName || 'Faction Rules'}`;
                    factionRulesHeading.textContent = title;
                }
                factionRulesSection.style.display = 'block';
                displayArmyRules(factionData.armyRules, armyRulesContainer);
                displayComposition(factionData.spearheadComposition, compositionContainer);
                displayRegimentAbilitySelection(factionData.regimentAbilities, regimentAbilityContainer);
                displayEnhancementSelection(factionData.enhancements, enhancementSelectionContainer);
                if (preselect) {
                    selectRadioByValue(regimentAbilityContainer, 'regiment-ability-selection', preselect.ability);
                    selectRadioByValue(enhancementSelectionContainer, 'enhancement-selection', preselect.enhancement);
                }
                checkSelectionsComplete();
            })
            .catch((error) => {
                console.error('Error loading spearhead data for match setup:', error);
                armyRulesContainer.innerHTML = '<h3>Army Rules</h3><p>Error loading data.</p>';
                factionRulesSection.style.display = 'block';
            });
    }

    function populateFactionGrid() {
        fetch('data/manifest.json')
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then((manifest) => {
                if (!window.SpearheadFactionPicker) {
                    console.error('faction-picker.js failed to load');
                    factionGridContainer.innerHTML =
                        '<p class="error-message">Faction picker failed to load. Please refresh.</p>';
                    return;
                }
                factionPickerApi = window.SpearheadFactionPicker.populateFactionGrid(
                    factionGridContainer,
                    manifest,
                    {
                        onSpearheadChosen: (dataFile) => loadAndDisplayFaction(dataFile)
                    }
                );
                applyReveal(factionGridContainer, '.faction-card-wrap', 0, 70);
            })
            .catch((error) => {
                console.error('Error loading faction list:', error);
                factionGridContainer.innerHTML =
                    '<p class="error-message">Error loading factions. Please try refreshing.</p>';
            });
    }

    function syncRulesetContinueState() {
        const ruleset = getSelectedRuleset();
        rulesetContinueBtn.disabled = !ruleset;
        document.querySelectorAll('.ruleset-option').forEach((label) => {
            const input = label.querySelector('input[name="ruleset"]');
            label.classList.toggle('selected', Boolean(input && input.checked));
        });
    }

    function commitRulesetAndContinue() {
        const ruleset = getSelectedRuleset();
        if (!ruleset) {
            alert('Please select a ruleset.');
            return;
        }
        matchSetup.ruleset = ruleset;
        matchSetup.sideA = null;
        matchSetup.sideB = null;
        saveMatchSetup();
        currentStep = 'A';
        pendingSelection = { faction: null, ability: null, enhancement: null };
        updateStepChrome();
        loadAndDisplayFaction(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('Ruleset selected:', RULESET_LABELS[ruleset] || ruleset);
    }

    function commitCurrentSide() {
        const payload = {
            faction: pendingSelection.faction,
            ability: pendingSelection.ability,
            enhancement: pendingSelection.enhancement
        };

        if (currentStep === 'A') {
            matchSetup.sideA = payload;
            saveMatchSetup();
            currentStep = 'B';
            pendingSelection = { faction: null, ability: null, enhancement: null };
            updateStepChrome();
            loadAndDisplayFaction(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('Side A committed; configuring Side B');
            return;
        }

        matchSetup.sideB = payload;
        if (!matchSetup.ruleset) {
            alert('Ruleset missing. Please start setup again and pick a ruleset.');
            currentStep = 'ruleset';
            updateStepChrome();
            return;
        }
        saveMatchSetup();
        console.log('Both sides ready — opening match board', {
            ruleset: matchSetup.ruleset
        });
        window.location.href = 'match.html';
    }

    document.querySelectorAll('input[name="ruleset"]').forEach((input) => {
        input.addEventListener('change', syncRulesetContinueState);
    });

    rulesetContinueBtn.addEventListener('click', commitRulesetAndContinue);

    mainContinueButton.addEventListener('click', () => {
        if (!pendingSelection.faction || !pendingSelection.ability || !pendingSelection.enhancement) {
            alert('Please select a Faction, Regiment Ability, and Enhancement.');
            return;
        }
        commitCurrentSide();
    });

    stepIndicator.querySelectorAll('.setup-step').forEach((el) => {
        const activate = () => {
            if (!el.classList.contains('is-clickable')) return;
            goToSetupStep(el.dataset.step);
        };
        el.addEventListener('click', activate);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
            }
        });
    });

    // Restore previously chosen ruleset radio if returning mid-setup
    if (matchSetup.ruleset) {
        const radio = document.querySelector(`input[name="ruleset"][value="${CSS.escape(matchSetup.ruleset)}"]`);
        if (radio) radio.checked = true;
    }
    syncRulesetContinueState();
    updateStepChrome();
    populateFactionGrid();
});
