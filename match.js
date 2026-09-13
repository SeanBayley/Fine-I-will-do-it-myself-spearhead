// Local 2-player match board (laptop dual overview).
// Copied/adapted from units.js patterns; does not modify solo units.js.

document.addEventListener('DOMContentLoaded', () => {
    const MATCH_SETUP_KEY = 'spearheadMatchSetup';
    const PHASES = ['hero', 'movement', 'shooting', 'charge', 'combat', 'taking-damage', 'end'];
    const PHASE_NAMES = [
        'Hero Phase',
        'Movement Phase',
        'Shooting Phase',
        'Charge Phase',
        'Combat Phase',
        'Taking Damage',
        'End of Turn'
    ];

    const missingSetupEl = document.getElementById('match-missing-setup');
    const matchBoardEl = document.getElementById('match-board');
    const setupPanel = document.getElementById('match-setup-panel');
    const turnOrderPanel = document.getElementById('match-turn-order');
    const inProgressPanel = document.getElementById('match-in-progress');

    const startMatchBtn = document.getElementById('start-match-btn');
    const sideAFirstBtn = document.getElementById('side-a-first-btn');
    const sideBFirstBtn = document.getElementById('side-b-first-btn');
    const nextPhaseBtn = document.getElementById('match-next-phase-btn');
    const endGameBtn = document.getElementById('match-end-game-btn');

    const currentTurnEl = document.getElementById('match-current-turn');
    const currentRoundEl = document.getElementById('match-current-round');
    const currentPhaseEl = document.getElementById('match-current-phase');
    const turnIndicatorEl = document.getElementById('match-turn-indicator');
    const roundNumberEl = document.getElementById('match-round-number');

    const tacticModal = document.getElementById('match-tactic-modal');
    const useCommandBtn = document.getElementById('match-use-command-btn');
    const closeTacticBtn = document.getElementById('match-close-tactic-btn');
    const scoringModal = document.getElementById('match-scoring-modal');
    const confirmScoringBtn = document.getElementById('match-confirm-scoring-btn');
    const tacticsScoringEl = document.getElementById('match-battle-tactics-scoring');
    const cardModal = document.getElementById('match-card-modal');
    const confirmCardsBtn = document.getElementById('match-confirm-cards-btn');
    const gameOverModal = document.getElementById('match-game-over-modal');
    const newGameBtn = document.getElementById('match-new-game-btn');
    const closeGameBtn = document.getElementById('match-close-game-btn');

    let battleTactics = [];
    let openTacticContext = null; // { sideId, cardNumber }
    let abilities = null;

    const match = {
        isActive: false,
        currentRound: 1,
        currentPhase: 0,
        activeSide: 'A',
        startingSide: null,
        roundTurnsCompleted: 0,
        phases: PHASES,
        phaseNames: PHASE_NAMES,
        sides: {
            A: null,
            B: null
        }
    };

    function createSideState(setup, label) {
        return {
            id: label,
            factionFile: setup.faction,
            ability: setup.ability,
            enhancement: setup.enhancement,
            factionData: null,
            displayName: label === 'A' ? 'Side A' : 'Side B',
            allCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            drawnCards: [],
            currentRoundCards: [],
            cardsByRound: {},
            keptCards: [],
            scoredCards: [],
            cardStates: {},
            scores: {
                rounds: {},
                gameTotal: 0
            }
        };
    }

    function loadSetup() {
        try {
            const raw = sessionStorage.getItem(MATCH_SETUP_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data?.sideA?.faction || !data?.sideB?.faction) return null;
            return data;
        } catch (err) {
            console.error('Failed to load match setup', err);
            return null;
        }
    }

    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    abilities = window.createMatchAbilityToolkit({
        getMatch: () => match,
        escapeHtml
    });

    function getCardStatus(side, cardNumber) {
        return side.cardStates[cardNumber] || 'Pending';
    }

    function setCardStatus(side, cardNumber, status) {
        side.cardStates[cardNumber] = status;
        const num = parseInt(cardNumber, 10);
        side.scoredCards = side.scoredCards.filter((c) => c !== num);
        side.keptCards = side.keptCards.filter((c) => c !== num);
        if (status === 'Scored' && !side.scoredCards.includes(num)) {
            side.scoredCards.push(num);
        }
        if (status === 'Kept' && !side.keptCards.includes(num)) {
            side.keptCards.push(num);
        }
        console.log(`Side ${side.id} card ${cardNumber} → ${status}`);
    }

    function applyEnhancementEffects(factionData, enhancementName) {
        if (!enhancementName || !factionData.enhancements) return;
        const selected = factionData.enhancements.find((e) => e.name === enhancementName);
        if (!selected) return;

        const effects = selected.legacy_effects || selected.effects || [];
        effects.forEach((effect) => {
            if (!effect.target?.unit || !factionData.units) return;
            const unit = factionData.units.find((u) => u.name === effect.target.unit);
            if (!unit) return;

            if (effect.type === 'addAbility' && effect.ability) {
                unit.abilities = unit.abilities || [];
                if (!unit.abilities.some((a) => a.name === effect.ability.name)) {
                    unit.abilities.push(effect.ability);
                }
            }
        });
    }

    const FACTION_THEME_CLASSES = [
        'stormcast-eternals',
        'skaven',
        'seraphon',
        'ossiarch-bonereapers',
        'sylvaneth'
    ];

    function applyActiveArmyChrome() {
        const active = match.sides[match.activeSide];
        const factionId = active?.factionData?.factionId || '';
        const board = document.getElementById('match-board');
        const targets = [document.body, board, document.querySelector('.match-shared-bar'), document.getElementById('match-unified-phases'), document.getElementById('match-cards-row')].filter(Boolean);

        targets.forEach((el) => {
            FACTION_THEME_CLASSES.forEach((cls) => el.classList.remove(cls));
            FACTION_THEME_CLASSES.forEach((cls) => el.classList.remove(`active-faction-${cls}`));
            if (factionId) {
                el.classList.add(factionId);
                el.classList.add(`active-faction-${factionId}`);
            }
        });

        // Keep body as match-page + active faction for shared background/buttons
        document.body.classList.add('match-page');
        if (factionId) document.body.classList.add(factionId);

        turnIndicatorEl.className = 'turn-indicator match-turn-indicator';
        if (factionId) turnIndicatorEl.classList.add(factionId);
    }

    function renderSideCards(side) {
        const container = document.getElementById(`side-cards-${side.id}`);
        const laneLabel = document.getElementById(`cards-lane-label-${side.id}`);
        if (laneLabel) laneLabel.textContent = `${side.displayName} Cards`;
        if (!container) return;

        container.innerHTML = '';
        container.className = 'match-tactic-slots';

        // Always show 3 slots above each column
        for (let i = 0; i < 3; i++) {
            const cardId = side.currentRoundCards[i];
            const slot = document.createElement('div');

            if (!cardId) {
                slot.className = 'match-tactic-slot is-empty';
                slot.innerHTML = `<div class="card-placeholder">Empty</div>`;
                container.appendChild(slot);
                continue;
            }

            const tactic = battleTactics.find((t) => t.cardNumber === cardId);
            const status = getCardStatus(side, cardId);
            const statusClass =
                status === 'Scored' ? 'is-scored' : status === 'Used' ? 'is-used' : 'is-pending';
            slot.className = `match-tactic-slot ${statusClass}`;
            slot.title = `${tactic?.name || `Card ${cardId}`} (${status})`;
            slot.style.cursor = 'pointer';
            slot.innerHTML = `
                <div class="card-number">${cardId}</div>
                <div class="card-name">${escapeHtml(tactic?.name || `Card ${cardId}`)}</div>
            `;
            slot.addEventListener('click', () => openTacticModal(side.id, cardId));
            container.appendChild(slot);
        }
    }

    function updateSharedDisplay() {
        const active = match.sides[match.activeSide];
        currentTurnEl.textContent = `${active.displayName}'s Turn`;
        currentRoundEl.textContent = match.currentRound;
        currentPhaseEl.textContent = PHASE_NAMES[match.currentPhase] || '—';
        updateActiveSideHighlight();
        applyActiveArmyChrome();
        updateScoreDisplays();
        renderSideCards(match.sides.A);
        renderSideCards(match.sides.B);
        abilities.onPhaseOrTurnChange(match.sides);
    }

    function calcSideTotals(side) {
        let primary = 0;
        let tactics = side.scoredCards.length;
        Object.values(side.scores.rounds).forEach((round) => {
            primary += round.primary || 0;
        });
        // Prefer stored round tactics when present (avoids double-count quirks)
        const storedTactics = Object.values(side.scores.rounds).reduce(
            (sum, round) => sum + (round.tactics || 0),
            0
        );
        if (storedTactics > 0) tactics = storedTactics;

        const total = primary + tactics;
        side.scores.gameTotal = total;
        return { primary, tactics, total };
    }

    function updateScoreDisplays() {
        ['A', 'B'].forEach((id) => {
            const side = match.sides[id];
            const totals = calcSideTotals(side);
            document.getElementById(`score-total-${id}`).textContent = totals.total;
            document.getElementById(`side-primary-${id}`).textContent = totals.primary;
            document.getElementById(`side-tactics-${id}`).textContent = totals.tactics;
            document.getElementById(`score-label-${id}`).textContent = side.displayName;
            document.getElementById(`final-label-${id}`).textContent = side.displayName;
            document.getElementById(`final-score-${id}`).textContent = totals.total;
        });
    }

    function updateActiveSideHighlight() {
        document.querySelectorAll('.match-side').forEach((panel) => {
            panel.classList.toggle('is-active', panel.dataset.side === match.activeSide);
        });
    }

    function drawCardsForSide(side) {
        const cardsForRound = [...side.keptCards];
        side.keptCards.forEach((cardNumber) => setCardStatus(side, cardNumber, 'Pending'));
        side.keptCards = [];
        side.currentRoundCards = [];

        const available = side.allCards.filter(
            (card) => !side.drawnCards.includes(card) && !cardsForRound.includes(card)
        );
        const toDraw = 3 - cardsForRound.length;
        for (let i = 0; i < toDraw && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            const drawn = available.splice(idx, 1)[0];
            cardsForRound.push(drawn);
            side.drawnCards.push(drawn);
            setCardStatus(side, drawn, 'Pending');
        }

        side.cardsByRound[match.currentRound] = cardsForRound;
        side.currentRoundCards = cardsForRound;
        console.log(`Side ${side.id} drew cards for round ${match.currentRound}:`, cardsForRound);
    }

    function drawCardsForRound() {
        drawCardsForSide(match.sides.A);
        drawCardsForSide(match.sides.B);
        renderSideCards(match.sides.A);
        renderSideCards(match.sides.B);
    }

    function openTacticModal(sideId, cardNumber) {
        const side = match.sides[sideId];
        const tactic = battleTactics.find((t) => t.cardNumber === cardNumber);
        if (!tactic) return;

        openTacticContext = { sideId, cardNumber };
        const status = getCardStatus(side, cardNumber);
        const statusEl = document.getElementById('match-tactic-status');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = '';
            statusEl.classList.add(`status-${status.toLowerCase()}`);
        }

        document.getElementById('match-tactic-title').textContent =
            `${side.displayName}: ${tactic.name}`;
        document.getElementById('match-tactic-description').textContent = tactic.description || '';
        document.getElementById('match-tactic-requirement').textContent = tactic.requirement || '';
        document.getElementById('match-command-name').textContent = tactic.command?.name || '—';
        document.getElementById('match-command-timing').textContent = tactic.command?.timing || '—';
        document.getElementById('match-command-declare').textContent = tactic.command?.declare || '—';
        document.getElementById('match-command-effect').textContent = tactic.command?.effect || '—';

        const isActiveSide = sideId === match.activeSide;
        const isPending = status === 'Pending';
        const inCurrentRound = side.currentRoundCards.includes(cardNumber);
        useCommandBtn.disabled = !(match.isActive && isActiveSide && isPending && inCurrentRound);
        useCommandBtn.textContent = status === 'Used' ? 'Command Used' : 'Use Command';

        tacticModal.style.display = 'flex';
    }

    function showScoringModal() {
        const side = match.sides[match.activeSide];
        document.getElementById('match-scoring-title').textContent =
            `Score Round ${match.currentRound} — ${side.displayName}`;

        document.getElementById('match-primary-1').checked = false;
        document.getElementById('match-primary-2').checked = false;
        document.getElementById('match-primary-3').checked = false;

        tacticsScoringEl.innerHTML = '';
        const pending = (side.cardsByRound[match.currentRound] || []).filter(
            (n) => getCardStatus(side, n) === 'Pending'
        );

        pending.forEach((cardNumber) => {
            const tactic = battleTactics.find((t) => t.cardNumber === cardNumber);
            if (!tactic) return;
            const card = document.createElement('div');
            card.className = 'tactic-scoring-card';
            card.dataset.cardNumber = cardNumber;
            card.innerHTML = `
                <div class="tactic-card-info">
                    <div class="tactic-card-name">${escapeHtml(tactic.name)}</div>
                    <div class="tactic-card-requirement">${escapeHtml(tactic.requirement || '')}</div>
                </div>
                <div class="tactic-card-actions">
                    <button class="tactic-action-btn score-btn" type="button">Score</button>
                </div>
            `;
            card.querySelector('.score-btn').addEventListener('click', () => {
                setCardStatus(side, cardNumber, 'Scored');
                if (!side.scores.rounds[match.currentRound]) {
                    side.scores.rounds[match.currentRound] = { primary: 0, tactics: 0, total: 0 };
                }
                side.scores.rounds[match.currentRound].tactics += 1;
                card.remove();
                updateModalScorePreview();
                renderSideCards(side);
            });
            tacticsScoringEl.appendChild(card);
        });

        ['match-primary-1', 'match-primary-2', 'match-primary-3'].forEach((id) => {
            document.getElementById(id).onchange = updateModalScorePreview;
        });

        updateModalScorePreview();
        scoringModal.style.display = 'flex';
    }

    function updateModalScorePreview() {
        const side = match.sides[match.activeSide];
        let primary = 0;
        if (document.getElementById('match-primary-1').checked) primary++;
        if (document.getElementById('match-primary-2').checked) primary++;
        if (document.getElementById('match-primary-3').checked) primary++;

        const tacticScore = (side.scores.rounds[match.currentRound] || { tactics: 0 }).tactics;
        const roundTotal = primary + tacticScore;

        let gameTotal = 0;
        Object.entries(side.scores.rounds).forEach(([roundNumber, roundScore]) => {
            if (parseInt(roundNumber, 10) !== match.currentRound) {
                gameTotal += roundScore.total || 0;
            }
        });
        gameTotal += roundTotal;

        document.getElementById('match-primary-score').textContent = primary;
        document.getElementById('match-tactic-score').textContent = tacticScore;
        document.getElementById('match-round-total').textContent = roundTotal;
        document.getElementById('match-side-game-total').textContent = gameTotal;
    }

    function confirmScoring() {
        const side = match.sides[match.activeSide];
        let primary = 0;
        if (document.getElementById('match-primary-1').checked) primary++;
        if (document.getElementById('match-primary-2').checked) primary++;
        if (document.getElementById('match-primary-3').checked) primary++;

        const tacticScore = (side.scores.rounds[match.currentRound] || { tactics: 0 }).tactics;
        const roundTotal = primary + tacticScore;
        side.scores.rounds[match.currentRound] = {
            primary,
            tactics: tacticScore,
            total: roundTotal
        };

        scoringModal.style.display = 'none';
        console.log(`Side ${side.id} scored round ${match.currentRound}`, side.scores.rounds[match.currentRound]);
        continueToNextTurn();
    }

    function buildCardManageColumn(sideId) {
        const side = match.sides[sideId];
        const container = document.getElementById(`card-manage-${sideId}`);
        document.getElementById(`card-manage-title-${sideId}`).textContent = side.displayName;
        container.innerHTML = '';

        const pending = (side.cardsByRound[match.currentRound] || []).filter(
            (n) => getCardStatus(side, n) === 'Pending'
        );

        if (!pending.length) {
            container.innerHTML = '<p class="no-cards-message">No pending cards</p>';
            return;
        }

        pending.forEach((cardNumber) => {
            const tactic = battleTactics.find((t) => t.cardNumber === cardNumber);
            if (!tactic) return;
            const el = document.createElement('div');
            el.className = 'tactic-scoring-card';
            el.dataset.cardNumber = cardNumber;
            el.innerHTML = `
                <div class="tactic-card-info">
                    <div class="tactic-card-name">${escapeHtml(tactic.name)}</div>
                </div>
                <div class="tactic-card-actions">
                    <button class="tactic-action-btn keep-btn" type="button" data-action="keep">Keep</button>
                    <button class="tactic-action-btn bin-btn" type="button" data-action="discard">Discard</button>
                </div>
            `;
            el.querySelectorAll('.tactic-action-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    setCardStatus(side, cardNumber, action === 'keep' ? 'Kept' : 'Discarded');
                    el.remove();
                    renderSideCards(side);
                });
            });
            container.appendChild(el);
        });
    }

    function showCardManagementModal() {
        buildCardManageColumn('A');
        buildCardManageColumn('B');
        cardModal.style.display = 'flex';
    }

    function confirmCardManagement() {
        // Auto-discard any unresolved pending cards for both sides
        ['A', 'B'].forEach((id) => {
            const side = match.sides[id];
            (side.cardsByRound[match.currentRound] || []).forEach((cardNumber) => {
                if (getCardStatus(side, cardNumber) === 'Pending') {
                    setCardStatus(side, cardNumber, 'Discarded');
                }
            });
        });

        cardModal.style.display = 'none';
        match.currentRound += 1;
        match.roundTurnsCompleted = 0;

        if (match.currentRound > 4) {
            endMatch('All 4 rounds have been completed.');
            return;
        }

        drawCardsForRound();
        showTurnOrderSelection();
    }

    function continueToNextTurn() {
        const endingSideId = match.activeSide;
        match.roundTurnsCompleted += 1;
        match.activeSide = match.activeSide === 'A' ? 'B' : 'A';
        match.currentPhase = 0;

        // Reset per-turn usage on the side that just finished
        if (match.sides[endingSideId]) {
            abilities.resetAbilityUsage(match.sides[endingSideId], 'per_turn');
        }

        if (match.roundTurnsCompleted >= 2) {
            abilities.onPhaseOrTurnChange(match.sides);
            showCardManagementModal();
            return;
        }

        updateSharedDisplay();
    }

    function nextPhase() {
        if (scoringModal.style.display === 'flex' || cardModal.style.display === 'flex') {
            console.warn('Cannot advance phase while a required modal is open');
            return;
        }
        if (!match.isActive) return;

        match.currentPhase += 1;
        if (match.currentPhase >= PHASES.length) {
            showScoringModal();
            return;
        }
        updateSharedDisplay();
    }

    function showTurnOrderSelection() {
        setupPanel.style.display = 'none';
        inProgressPanel.style.display = 'none';
        turnOrderPanel.style.display = 'block';
        roundNumberEl.textContent = match.currentRound;

        sideAFirstBtn.textContent = `${match.sides.A.displayName} Goes First`;
        sideBFirstBtn.textContent = `${match.sides.B.displayName} Goes First`;
    }

    function beginRoundWithStartingSide(sideId) {
        match.startingSide = sideId;
        match.activeSide = sideId;
        match.roundTurnsCompleted = 0;
        match.currentPhase = 0;
        turnOrderPanel.style.display = 'none';
        inProgressPanel.style.display = 'flex';

        if (!match.isActive) {
            match.isActive = true;
            drawCardsForRound();
        }

        updateSharedDisplay();
        console.log(`Round ${match.currentRound} starting with Side ${sideId}`);
    }

    function endMatch(message) {
        match.isActive = false;
        updateScoreDisplays();
        document.getElementById('match-game-over-message').textContent = message;
        const a = match.sides.A.scores.gameTotal;
        const b = match.sides.B.scores.gameTotal;
        const winnerLine = document.getElementById('match-winner-line');
        if (a === b) {
            winnerLine.textContent = 'Result: Draw';
        } else if (a > b) {
            winnerLine.textContent = `Winner: ${match.sides.A.displayName}`;
        } else {
            winnerLine.textContent = `Winner: ${match.sides.B.displayName}`;
        }
        scoringModal.style.display = 'none';
        cardModal.style.display = 'none';
        tacticModal.style.display = 'none';
        gameOverModal.style.display = 'flex';
        console.log('Match over', { a, b });
    }

    async function loadFactionForSide(side) {
        const response = await fetch(side.factionFile);
        if (!response.ok) throw new Error(`Failed to load ${side.factionFile}`);
        const data = await response.json();
        applyEnhancementEffects(data, side.enhancement);
        side.factionData = data;
        side.displayName = data.factionName || side.displayName;
        abilities.prepareSide(side);

        const factionId = data.factionId || '';
        const panel = document.getElementById(`side-panel-${side.id}`);
        const scorePill = document.querySelector(`.match-score-pill[data-side="${side.id}"]`);

        // Replace any previous faction theme class on this panel/pill only
        const themeClasses = [
            'stormcast-eternals',
            'skaven',
            'seraphon',
            'ossiarch-bonereapers',
            'sylvaneth'
        ];
        themeClasses.forEach((cls) => {
            panel.classList.remove(cls);
            if (scorePill) scorePill.classList.remove(cls);
        });
        if (factionId) {
            panel.classList.add(factionId);
            if (scorePill) scorePill.classList.add(factionId);
            const cardsLane = document.querySelector(`.match-cards-lane[data-side="${side.id}"]`);
            if (cardsLane) {
                themeClasses.forEach((cls) => cardsLane.classList.remove(cls));
                cardsLane.classList.add(factionId);
            }
        }

        document.getElementById(`side-name-${side.id}`).textContent = side.displayName;
        document.getElementById(`side-ability-${side.id}`).textContent = side.ability;
        document.getElementById(`side-enhancement-${side.id}`).textContent = side.enhancement;

        abilities.renderSideUnits(side);
    }

    async function initMatchBoard(setup) {
        match.sides.A = createSideState(setup.sideA, 'A');
        match.sides.B = createSideState(setup.sideB, 'B');

        const tacticsRes = await fetch('data/battle_tactics.json');
        if (!tacticsRes.ok) throw new Error('Failed to load battle tactics');
        const tacticsData = await tacticsRes.json();
        battleTactics = tacticsData.battleTactics || [];

        await Promise.all([loadFactionForSide(match.sides.A), loadFactionForSide(match.sides.B)]);
        abilities.populateUnifiedPhaseRules(match.sides);

        sideAFirstBtn.textContent = `${match.sides.A.displayName} Goes First`;
        sideBFirstBtn.textContent = `${match.sides.B.displayName} Goes First`;
        updateScoreDisplays();

        // Keep page chrome neutral so each column owns its faction colours
        document.body.className = 'match-page';

        missingSetupEl.style.display = 'none';
        matchBoardEl.style.display = 'block';
        console.log('Match board ready', match.sides);
    }

    // --- Events ---
    startMatchBtn.addEventListener('click', () => {
        showTurnOrderSelection();
    });

    sideAFirstBtn.addEventListener('click', () => beginRoundWithStartingSide('A'));
    sideBFirstBtn.addEventListener('click', () => beginRoundWithStartingSide('B'));
    nextPhaseBtn.addEventListener('click', nextPhase);
    endGameBtn.addEventListener('click', () => {
        if (confirm('End the match early?')) {
            endMatch('Match ended early.');
        }
    });

    confirmScoringBtn.addEventListener('click', confirmScoring);
    confirmCardsBtn.addEventListener('click', confirmCardManagement);

    closeTacticBtn.addEventListener('click', () => {
        tacticModal.style.display = 'none';
        openTacticContext = null;
    });

    useCommandBtn.addEventListener('click', () => {
        if (!openTacticContext) return;
        const side = match.sides[openTacticContext.sideId];
        if (openTacticContext.sideId !== match.activeSide) return;
        if (getCardStatus(side, openTacticContext.cardNumber) !== 'Pending') return;
        setCardStatus(side, openTacticContext.cardNumber, 'Used');
        useCommandBtn.textContent = 'Command Used';
        useCommandBtn.disabled = true;
        renderSideCards(side);
        console.log(`Side ${side.id} used command on card ${openTacticContext.cardNumber}`);
    });

    newGameBtn.addEventListener('click', () => {
        window.location.href = 'match-setup.html';
    });
    closeGameBtn.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
    });

    // Do not dismiss scoring/card modals on backdrop (same fix as solo)
    window.addEventListener('click', (event) => {
        if (event.target === tacticModal) {
            tacticModal.style.display = 'none';
            openTacticContext = null;
        }
        if (event.target === gameOverModal) {
            gameOverModal.style.display = 'none';
        }
    });

    // Boot
    const setup = loadSetup();
    if (!setup) {
        missingSetupEl.style.display = 'block';
        matchBoardEl.style.display = 'none';
        console.warn('No match setup in sessionStorage');
        return;
    }

    initMatchBoard(setup).catch((err) => {
        console.error(err);
        missingSetupEl.style.display = 'block';
        matchBoardEl.style.display = 'none';
        missingSetupEl.querySelector('p').textContent =
            'Could not load army data. Check the console and try setup again.';
    });
});
