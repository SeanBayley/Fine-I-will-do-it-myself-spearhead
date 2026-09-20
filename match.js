// Local 2-player match board (laptop dual overview).
// Copied/adapted from units.js patterns; does not modify solo units.js.

document.addEventListener('DOMContentLoaded', () => {
    const MATCH_SETUP_KEY = 'spearheadMatchSetup';
    const PHASES = ['hero', 'movement', 'shooting', 'charge', 'combat', 'end'];
    const PHASE_NAMES = [
        'Hero Phase',
        'Movement Phase',
        'Shooting Phase',
        'Charge Phase',
        'Combat Phase',
        'End of Turn'
    ];

    const missingSetupEl = document.getElementById('match-missing-setup');
    const matchBoardEl = document.getElementById('match-board');
    const setupPanel = document.getElementById('match-setup-panel');
    const turnOrderPanel = document.getElementById('match-turn-order');
    const inProgressPanel = document.getElementById('match-in-progress');
    const seizeChoicePanel = document.getElementById('match-seize-choice');
    const seizeWarningPanel = document.getElementById('match-seize-warning');
    const seizeYesBtn = document.getElementById('seize-yes-btn');
    const seizeForcedBtn = document.getElementById('seize-forced-btn');
    const seizeChoiceBackBtn = document.getElementById('seize-choice-back-btn');
    const seizeConfirmBtn = document.getElementById('seize-confirm-btn');
    const seizeWarningBackBtn = document.getElementById('seize-warning-back-btn');

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
    const versusScreen = document.getElementById('match-versus-screen');
    const versusContinueBtn = document.getElementById('versus-continue-btn');
    const twistModal = document.getElementById('match-twist-modal');
    const closeTwistBtn = document.getElementById('match-close-twist-btn');
    const startMatchHint = document.getElementById('start-match-hint');
    const endRoundTwistModal = document.getElementById('match-end-round-twist-modal');
    const confirmEndRoundTwistBtn = document.getElementById('match-confirm-end-round-twist-btn');

    let battleTactics = [];
    let openTacticContext = null; // { sideId, cardNumber }
    let previousModal = null; // restore after peeking tactic details (e.g. card management)
    let abilities = null;
    let versusShownThisMatch = false;
    let twistsData = null; // full twists.json payload
    let activeTwistDeck = null; // { id, name, twists: [] }
    let pendingTwistPoints = 0; // scoring-modal draft for current side
    let endRoundTwistDraft = { A: 0, B: 0 };

    const RULESET_FILES = {
        'fire-and-jade': 'data/battle_tactics.json',
        'city-of-ash': 'data/city_of_ash_battle_tactics.json',
        custom: null
    };
    const RULESET_LABELS = {
        'fire-and-jade': 'Fire and Jade',
        'city-of-ash': 'City of Ash',
        custom: 'Custom'
    };

    // Neon colours for the VS screen — keep in sync with faction themes in style.css
    const FACTION_VS_COLORS = {
        'stormcast-eternals': { color: '#0d6efd', rgb: '13, 110, 253' },
        skaven: { color: '#8FD129', rgb: '143, 209, 41' },
        seraphon: { color: '#40E0D0', rgb: '64, 224, 208' },
        'ossiarch-bonereapers': { color: '#F5F5DC', rgb: '245, 245, 220' },
        sylvaneth: { color: '#22c55e', rgb: '34, 197, 94' },
        'orruk-warclans': { color: '#84cc16', rgb: '132, 204, 22' },
        'daughters-of-khaine': { color: '#be123c', rgb: '190, 18, 60' },
        'cities-of-sigmar': { color: '#b91c1c', rgb: '185, 28, 28' },
        'helsmiths-of-hashut': { color: '#1f4d38', rgb: '31, 77, 56' },
        'idoneth-deepkin': { color: '#0f766e', rgb: '15, 118, 110' }
    };

    // Image folder names under /images (underscore style used by existing assets)
    const FACTION_IMAGE_FOLDERS = {
        'stormcast-eternals': 'stormcast_eternals',
        skaven: 'skaven',
        seraphon: 'seraphon',
        'ossiarch-bonereapers': 'ossiarch_bonereapers',
        sylvaneth: 'sylvaneth',
        'orruk-warclans': 'orruk_warclans',
        'daughters-of-khaine': 'daughters_of_khaine',
        'cities-of-sigmar': 'cities_of_sigmar',
        'helsmiths-of-hashut': 'helsmiths_of_hashut',
        'idoneth-deepkin': 'idoneth_deepkin'
    };

    const match = {
        isActive: false,
        ruleset: 'fire-and-jade',
        twistDeckId: null,
        currentTwist: null,
        twistByRound: {},
        drawnTwistIds: [],
        currentRound: 1,
        currentPhase: 0,
        activeSide: 'A',
        startingSide: null,
        underdogSide: null, // 'A' | 'B' | null — locked for the current battle round
        lastRoundSecondSide: null, // who went second last round (for Seizing the Initiative)
        pendingFirstSide: null, // first-player pick awaiting seize confirmation
        roundTurnsCompleted: 0,
        phases: PHASES,
        phaseNames: PHASE_NAMES,
        sides: {
            A: null,
            B: null
        }
    };

    function isCustomRuleset() {
        return match.ruleset === 'custom';
    }

    function usesBattleTacticCards() {
        return !isCustomRuleset();
    }

    function usesTwists() {
        return !isCustomRuleset();
    }

    function getAvailableTwistDecks() {
        const pack = twistsData?.rulesets?.[match.ruleset];
        return pack?.decks || [];
    }

    function getCurrentTwistMaxPoints() {
        const max = Number(match.currentTwist?.maxPoints);
        return Number.isFinite(max) && max > 0 ? max : 0;
    }

    function getTwistScoringTiming(twist = match.currentTwist) {
        return twist?.scoringTiming === 'end_of_battle_round'
            ? 'end_of_battle_round'
            : 'end_of_turn';
    }

    function twistScoresAtEndOfTurn() {
        return (
            usesTwists() &&
            match.currentTwist &&
            getCurrentTwistMaxPoints() > 0 &&
            getTwistScoringTiming() === 'end_of_turn'
        );
    }

    function twistScoresAtEndOfBattleRound() {
        return (
            usesTwists() &&
            match.currentTwist &&
            getCurrentTwistMaxPoints() > 0 &&
            getTwistScoringTiming() === 'end_of_battle_round'
        );
    }

    function persistTwistDeckSelection(deckId) {
        try {
            const raw = sessionStorage.getItem(MATCH_SETUP_KEY);
            if (!raw) {
                console.warn('Skipping twist deck persist — no match setup in sessionStorage');
                return;
            }
            const data = JSON.parse(raw);
            if (!data?.sideA?.faction || !data?.sideB?.faction || !data?.ruleset) {
                console.warn('Skipping twist deck persist — incomplete match setup');
                return;
            }
            data.twistDeck = deckId || null;
            sessionStorage.setItem(MATCH_SETUP_KEY, JSON.stringify(data));
            console.log('Persisted twist deck selection', deckId);
        } catch (err) {
            console.warn('Could not persist twist deck selection', err);
        }
    }

    function updateStartMatchGate() {
        if (!startMatchBtn) return;
        if (!usesTwists()) {
            startMatchBtn.disabled = false;
            if (startMatchHint) startMatchHint.style.display = 'none';
            return;
        }
        const ready = Boolean(match.twistDeckId && activeTwistDeck);
        startMatchBtn.disabled = !ready;
        if (startMatchHint) {
            startMatchHint.style.display = ready ? 'none' : 'block';
        }
    }

    function createSideState(setup, label) {
        const deck = usesBattleTacticCards()
            ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            : [];
        return {
            id: label,
            factionFile: setup.faction,
            ability: setup.ability,
            enhancement: setup.enhancement,
            factionData: null,
            displayName: label === 'A' ? 'Side A' : 'Side B',
            allCards: deck,
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
            if (!data.ruleset || !Object.prototype.hasOwnProperty.call(RULESET_FILES, data.ruleset)) {
                console.warn('Match setup missing or unknown ruleset; defaulting to fire-and-jade');
                data.ruleset = 'fire-and-jade';
            }
            return data;
        } catch (err) {
            console.error('Failed to load match setup', err);
            return null;
        }
    }

    function applyRulesetChrome() {
        const badge = document.getElementById('match-ruleset-badge');
        if (badge) {
            const twistLabel = activeTwistDeck ? ` · Twist: ${activeTwistDeck.name}` : '';
            badge.textContent = `Ruleset: ${RULESET_LABELS[match.ruleset] || match.ruleset}${
                usesTwists() ? twistLabel : ''
            }`;
        }
        if (matchBoardEl) {
            matchBoardEl.classList.toggle('ruleset-custom', isCustomRuleset());
            matchBoardEl.classList.toggle('ruleset-city-of-ash', match.ruleset === 'city-of-ash');
            matchBoardEl.classList.toggle('ruleset-fire-and-jade', match.ruleset === 'fire-and-jade');
            matchBoardEl.classList.toggle('has-twists', usesTwists());
        }
        const cardsRow = document.getElementById('match-cards-row');
        if (cardsRow) {
            cardsRow.style.display = usesBattleTacticCards() ? '' : 'none';
        }
        const twistRow = document.getElementById('match-twist-row');
        if (twistRow) {
            twistRow.style.display = usesTwists() ? '' : 'none';
        }
        console.log('Applied ruleset chrome', match.ruleset, match.twistDeckId);
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
        'sylvaneth',
        'daughters-of-khaine',
        'cities-of-sigmar',
        'helsmiths-of-hashut',
        'idoneth-deepkin'
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
        const scorebarRound = document.getElementById('match-scorebar-round');
        if (scorebarRound) scorebarRound.textContent = match.currentRound;
        currentPhaseEl.textContent = PHASE_NAMES[match.currentPhase] || '—';
        updateActiveSideHighlight();
        applyActiveArmyChrome();
        updateScoreDisplays();
        if (usesBattleTacticCards()) {
            renderSideCards(match.sides.A);
            renderSideCards(match.sides.B);
        }
        renderCurrentTwistSlot();
        abilities.onPhaseOrTurnChange(match.sides);
    }

    function calcSideTotals(side) {
        let primary = 0;
        let twist = 0;
        let tactics = 0;
        const rounds = Object.values(side.scores.rounds || {});
        rounds.forEach((round) => {
            primary += round.primary || 0;
            twist += round.twist || 0;
            tactics += round.tactics || 0;
        });
        // Only fall back to scoredCards when no round scores exist yet
        if (!rounds.length && !isCustomRuleset()) {
            tactics = side.scoredCards.length;
        }

        const total = primary + tactics + twist;
        side.scores.gameTotal = total;
        return { primary, tactics, twist, total };
    }

    function updateScoreDisplays() {
        ['A', 'B'].forEach((id) => {
            const side = match.sides[id];
            const totals = calcSideTotals(side);
            document.getElementById(`score-total-${id}`).textContent = totals.total;
            document.getElementById(`side-primary-${id}`).textContent = totals.primary;
            document.getElementById(`side-tactics-${id}`).textContent = totals.tactics;
            const twistEl = document.getElementById(`side-twist-${id}`);
            if (twistEl) twistEl.textContent = totals.twist;
            document.getElementById(`score-label-${id}`).textContent = side.displayName;
            document.getElementById(`final-label-${id}`).textContent = side.displayName;
            document.getElementById(`final-score-${id}`).textContent = totals.total;
        });
        updateUnderdogDisplay();
    }

    // Underdog is locked at round start from current totals; tied scores → no underdog.
    function determineUnderdogForRound() {
        const scoreA = calcSideTotals(match.sides.A).total;
        const scoreB = calcSideTotals(match.sides.B).total;
        if (scoreA === scoreB) {
            match.underdogSide = null;
        } else {
            match.underdogSide = scoreA < scoreB ? 'A' : 'B';
        }
        console.log(`Round ${match.currentRound} underdog:`, {
            underdogSide: match.underdogSide,
            scoreA,
            scoreB
        });
        updateUnderdogDisplay();
    }

    function updateUnderdogDisplay() {
        ['A', 'B'].forEach((id) => {
            const icon = document.getElementById(`underdog-icon-${id}`);
            const pill = document.querySelector(`.match-score-pill[data-side="${id}"]`);
            const isUnderdog = match.underdogSide === id;
            if (icon) {
                icon.hidden = !isUnderdog;
                icon.setAttribute('aria-hidden', isUnderdog ? 'false' : 'true');
            }
            if (pill) pill.classList.toggle('is-underdog', isUnderdog);
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

    // Seizing the Initiative: carry kept hand only — no new draws this round
    function carryKeptCardsOnly(side) {
        const cardsForRound = [...side.keptCards];
        side.keptCards.forEach((cardNumber) => setCardStatus(side, cardNumber, 'Pending'));
        side.keptCards = [];
        side.currentRoundCards = cardsForRound;
        side.cardsByRound[match.currentRound] = cardsForRound;
        console.log(
            `Side ${side.id} seized initiative — carrying ${cardsForRound.length} kept card(s), no draw`
        );
    }

    function drawCardsForRound(options = {}) {
        if (!usesBattleTacticCards()) {
            console.log('Custom ruleset — skipping card draw');
            return;
        }
        const skipId = options.skipDrawForSide || null;
        ['A', 'B'].forEach((id) => {
            const side = match.sides[id];
            if (skipId === id) {
                carryKeptCardsOnly(side);
            } else {
                drawCardsForSide(side);
            }
            renderSideCards(side);
        });
    }

    function getVictoryPointGap() {
        const scoreA = calcSideTotals(match.sides.A).total;
        const scoreB = calcSideTotals(match.sides.B).total;
        return Math.abs(scoreA - scoreB);
    }

    // Exempt from seize penalty: underdog AND behind by 5+ VP
    function isSeizeDrawExempt(sideId) {
        return match.underdogSide === sideId && getVictoryPointGap() >= 5;
    }

    function couldBeSeizingInitiative(sideId) {
        return (
            usesBattleTacticCards() &&
            match.currentRound > 1 &&
            match.lastRoundSecondSide &&
            sideId === match.lastRoundSecondSide
        );
    }

    function hideSeizePanels() {
        if (seizeChoicePanel) seizeChoicePanel.style.display = 'none';
        if (seizeWarningPanel) seizeWarningPanel.style.display = 'none';
    }

    function showSeizeChoiceModal(sideId) {
        const side = match.sides[sideId];
        turnOrderPanel.style.display = 'none';
        inProgressPanel.style.display = 'none';
        if (seizeWarningPanel) seizeWarningPanel.style.display = 'none';
        if (seizeChoicePanel) {
            document.getElementById('match-seize-choice-text').textContent =
                `${side.displayName} went second last round and is going first now. ` +
                `Did they seize the initiative, or were they forced to take a double turn?`;
            seizeChoicePanel.style.display = 'flex';
        }
        console.log('Seize choice prompt for', sideId);
    }

    function populateSeizeKeptCardsPreview(sideId) {
        const container = document.getElementById('match-seize-kept-cards');
        if (!container) return;
        const side = match.sides[sideId];
        const kept = [...(side.keptCards || [])];
        container.innerHTML = '';
        if (!kept.length) {
            container.innerHTML =
                '<p class="seize-kept-empty">No cards currently in hand — they will have an empty hand this round.</p>';
            return;
        }
        kept.forEach((cardNumber) => {
            const tactic = battleTactics.find((t) => t.cardNumber === cardNumber);
            const el = document.createElement('div');
            el.className = 'seize-kept-card';
            el.textContent = tactic?.name
                ? `${cardNumber}. ${tactic.name}`
                : `Card ${cardNumber}`;
            container.appendChild(el);
        });
    }

    function showSeizeWarningModal(sideId) {
        const side = match.sides[sideId];
        if (seizeChoicePanel) seizeChoicePanel.style.display = 'none';
        populateSeizeKeptCardsPreview(sideId);
        document.getElementById('match-seize-warning-text').textContent =
            `${side.displayName} is seizing the initiative. They will not draw battle tactic cards this battle round.`;
        if (seizeWarningPanel) seizeWarningPanel.style.display = 'flex';
        console.log('Seize warning shown for', sideId, 'kept:', side.keptCards);
    }

    function returnToTurnOrderFromSeize() {
        match.pendingFirstSide = null;
        hideSeizePanels();
        showTurnOrderSelection();
        console.log('Returned to turn-order selection from seize flow');
    }

    function renderCurrentTwistSlot() {
        const slot = document.getElementById('match-twist-slot');
        const row = document.getElementById('match-twist-row');
        if (!slot || !row) return;

        if (!usesTwists()) {
            row.style.display = 'none';
            return;
        }
        row.style.display = '';

        const twist = match.currentTwist;
        if (!twist) {
            slot.className = 'match-twist-slot is-empty';
            slot.title = 'No twist drawn yet';
            slot.innerHTML = '<div class="card-placeholder">No twist yet</div>';
            slot.onclick = null;
            return;
        }

        const maxPts = getCurrentTwistMaxPoints();
        slot.className = 'match-twist-slot is-active';
        slot.title = `${twist.name} (click for details)`;
        slot.innerHTML = `
            <div class="twist-slot-deck">${escapeHtml(activeTwistDeck?.name || 'Twist')}</div>
            <div class="twist-slot-name">${escapeHtml(twist.name)}</div>
            <div class="twist-slot-meta">${maxPts > 0 ? `Up to ${maxPts} VP` : 'No VP'}</div>
        `;
        slot.onclick = () => openTwistModal(twist);
    }

    function openTwistModal(twist) {
        if (!twist || !twistModal) return;
        document.getElementById('match-twist-modal-title').textContent = twist.name || 'Twist';
        const deckEl = document.getElementById('match-twist-modal-deck');
        if (deckEl) {
            deckEl.textContent = activeTwistDeck
                ? `${activeTwistDeck.name} Twist · Round ${match.currentRound}`
                : `Round ${match.currentRound}`;
        }
        document.getElementById('match-twist-modal-flavor').textContent = twist.flavor || '';
        const rulesEl = document.getElementById('match-twist-modal-rules');
        if (rulesEl) {
            const rules = Array.isArray(twist.rules) ? twist.rules : [];
            rulesEl.innerHTML = rules.length
                ? `<ul>${rules.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
                : '<p>No rules listed.</p>';
        }
        document.getElementById('match-twist-modal-max').textContent = String(
            Number(twist.maxPoints) || 0
        );
        twistModal.style.display = 'flex';
        twistModal.classList.add('modal-stack-top');
        console.log('Opened twist modal', twist.id || twist.name);
    }

    function closeTwistModal() {
        if (!twistModal) return;
        twistModal.style.display = 'none';
        twistModal.classList.remove('modal-stack-top');
    }

    function drawTwistForRound() {
        if (!usesTwists() || !activeTwistDeck) {
            match.currentTwist = null;
            renderCurrentTwistSlot();
            return;
        }

        // One twist per battle round — keep existing if already drawn
        if (match.twistByRound[match.currentRound]) {
            match.currentTwist = match.twistByRound[match.currentRound];
            renderCurrentTwistSlot();
            console.log('Reusing twist for round', match.currentRound, match.currentTwist?.name);
            return;
        }

        const pool = (activeTwistDeck.twists || []).filter(
            (t) => !match.drawnTwistIds.includes(t.id)
        );
        const source = pool.length ? pool : [...(activeTwistDeck.twists || [])];
        if (!source.length) {
            console.warn('Twist deck is empty; no card drawn');
            match.currentTwist = null;
            renderCurrentTwistSlot();
            return;
        }

        const idx = Math.floor(Math.random() * source.length);
        const drawn = source[idx];
        match.currentTwist = drawn;
        match.twistByRound[match.currentRound] = drawn;
        if (drawn.id && !match.drawnTwistIds.includes(drawn.id)) {
            match.drawnTwistIds.push(drawn.id);
        }
        renderCurrentTwistSlot();
        console.log(`Drew twist for round ${match.currentRound}:`, drawn.name, {
            maxPoints: drawn.maxPoints
        });
    }

    function setPendingTwistPoints(value) {
        const max = getCurrentTwistMaxPoints();
        const clamped = Math.max(0, Math.min(max, Number(value) || 0));
        pendingTwistPoints = clamped;
        const input = document.getElementById('match-twist-points-input');
        if (input) input.value = String(pendingTwistPoints);
    }

    function setupTwistScoringControls() {
        const section = document.getElementById('match-twist-scoring-section');
        if (!section) return;

        // End-of-battle-round twists are scored after both turns, not here
        if (!twistScoresAtEndOfTurn()) {
            section.style.display = 'none';
            pendingTwistPoints = 0;
            return;
        }

        const maxPts = getCurrentTwistMaxPoints();
        section.style.display = 'block';
        const nameEl = document.getElementById('match-twist-scoring-name');
        const maxEl = document.getElementById('match-twist-points-max');
        if (nameEl) nameEl.textContent = match.currentTwist.name || 'Twist';
        if (maxEl) maxEl.textContent = String(maxPts);

        const side = match.sides[match.activeSide];
        const existing = side?.scores?.rounds?.[match.currentRound]?.twist;
        setPendingTwistPoints(typeof existing === 'number' ? existing : 0);
    }

    function applyTwistPointsToRound(side, twistPoints) {
        if (!side.scores.rounds[match.currentRound]) {
            side.scores.rounds[match.currentRound] = {
                primary: 0,
                tactics: 0,
                twist: 0,
                total: 0
            };
        }
        const round = side.scores.rounds[match.currentRound];
        round.twist = Math.max(0, Number(twistPoints) || 0);
        round.total = (round.primary || 0) + (round.tactics || 0) + (round.twist || 0);
    }

    function needsEndRoundTwistScoring() {
        return twistScoresAtEndOfBattleRound();
    }

    function showEndRoundTwistModal() {
        if (!endRoundTwistModal || !match.currentTwist) {
            finishEndOfRoundFlow();
            return;
        }
        const maxPts = getCurrentTwistMaxPoints();
        document.getElementById('match-end-round-twist-title').textContent =
            `End of Round ${match.currentRound} — Twist Scoring`;
        document.getElementById('match-end-round-twist-name').textContent =
            `${match.currentTwist.name} (up to ${maxPts} VP each)`;

        endRoundTwistDraft = { A: 0, B: 0 };
        ['A', 'B'].forEach((id) => {
            const side = match.sides[id];
            document.getElementById(`end-round-twist-label-${id}`).textContent = side.displayName;
            document.getElementById(`end-round-twist-max-${id}`).textContent = String(maxPts);
            const existing = side.scores.rounds[match.currentRound]?.twist;
            endRoundTwistDraft[id] = typeof existing === 'number' ? existing : 0;
            document.getElementById(`end-round-twist-points-${id}`).value = String(
                endRoundTwistDraft[id]
            );
        });

        endRoundTwistModal.style.display = 'flex';
        console.log('End-of-round twist scoring opened', match.currentTwist.name);
    }

    function confirmEndRoundTwistScoring() {
        ['A', 'B'].forEach((id) => {
            applyTwistPointsToRound(match.sides[id], endRoundTwistDraft[id]);
        });
        if (endRoundTwistModal) endRoundTwistModal.style.display = 'none';
        updateScoreDisplays();
        console.log('End-of-round twist scoring confirmed', endRoundTwistDraft);
        finishEndOfRoundFlow();
    }

    function finishEndOfRoundFlow() {
        // Remember who went second this round (for Seizing the Initiative next round)
        if (match.startingSide) {
            match.lastRoundSecondSide = match.startingSide === 'A' ? 'B' : 'A';
            console.log('Recorded last-round second player', match.lastRoundSecondSide);
        }

        // After round 4, skip keep/discard — those choices never apply
        if (match.currentRound >= 4) {
            endMatch('All 4 rounds have been completed.');
            return;
        }
        if (usesBattleTacticCards()) {
            showCardManagementModal();
            return;
        }
        console.log('Custom ruleset — skipping end-of-round card management');
        advanceAfterBothTurns();
    }

    function getCustomTacticScoreFromModal() {
        let score = 0;
        if (document.getElementById('match-custom-tactic-1')?.checked) score++;
        if (document.getElementById('match-custom-tactic-2')?.checked) score++;
        if (document.getElementById('match-custom-tactic-3')?.checked) score++;
        return score;
    }

    function advanceAfterBothTurns() {
        match.currentRound += 1;
        match.roundTurnsCompleted = 0;
        match.currentTwist = null;

        if (match.currentRound > 4) {
            endMatch('All 4 rounds have been completed.');
            return;
        }

        // Cards + twist are drawn together when the round actually starts
        // (after first-player selection), so turn-order picks stay clean.
        renderCurrentTwistSlot();
        showTurnOrderSelection();
    }

    function openTacticModal(sideId, cardNumber, fromModal = null) {
        const side = match.sides[sideId];
        const tactic = battleTactics.find((t) => t.cardNumber === cardNumber);
        if (!tactic) return;

        if (fromModal) {
            previousModal = fromModal;
            fromModal.style.display = 'none';
        }

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

        const isPending = status === 'Pending';
        const inCurrentRound = side.currentRoundCards.includes(cardNumber);
        // Peeking from keep/discard — details only, no command use mid-management
        if (fromModal === cardModal) {
            useCommandBtn.disabled = true;
            useCommandBtn.textContent = 'Close to Keep or Discard';
        } else if (fromModal === scoringModal) {
            // Peek from scoring — details only; score or command from the board/scoring actions
            useCommandBtn.disabled = true;
            useCommandBtn.textContent = 'Close to Score';
        } else {
            // Commands can be used on either side's turn (pass-and-play)
            useCommandBtn.disabled = !(match.isActive && isPending && inCurrentRound);
            useCommandBtn.textContent = status === 'Used' ? 'Command Used' : 'Use Command';
        }

        tacticModal.style.display = 'flex';
        tacticModal.classList.add('modal-stack-top');
    }

    function showScoringModal() {
        const side = match.sides[match.activeSide];
        document.getElementById('match-scoring-title').textContent =
            `Score Round ${match.currentRound} — ${side.displayName}`;

        document.getElementById('match-primary-1').checked = false;
        document.getElementById('match-primary-2').checked = false;
        document.getElementById('match-primary-3').checked = false;

        // Ensure round score bucket exists before scoring interactions
        if (!side.scores.rounds[match.currentRound]) {
            side.scores.rounds[match.currentRound] = { primary: 0, tactics: 0, twist: 0, total: 0 };
        } else if (isCustomRuleset()) {
            // Custom uses checkboxes each open; card mode keeps any in-modal Score taps
            side.scores.rounds[match.currentRound].tactics = 0;
        }
        if (typeof side.scores.rounds[match.currentRound].twist !== 'number') {
            side.scores.rounds[match.currentRound].twist = 0;
        }

        const customTacticsEl = document.getElementById('match-custom-tactics-scoring');
        const heading = document.getElementById('match-tactics-scoring-heading');

        if (isCustomRuleset()) {
            if (heading) heading.textContent = 'Battle Tactics (tick up to three)';
            tacticsScoringEl.innerHTML = '';
            tacticsScoringEl.style.display = 'none';
            if (customTacticsEl) {
                customTacticsEl.style.display = 'flex';
                ['match-custom-tactic-1', 'match-custom-tactic-2', 'match-custom-tactic-3'].forEach((id) => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.checked = false;
                        input.onchange = updateModalScorePreview;
                    }
                });
            }
        } else {
            if (heading) heading.textContent = 'Battle Tactics';
            if (customTacticsEl) customTacticsEl.style.display = 'none';
            tacticsScoringEl.style.display = '';
            tacticsScoringEl.innerHTML = '';
            // INTENTIONAL (not a bug): only Pending cards can be scored.
            // Using a card's command sets status to Used, which removes it from
            // scoring — that is by design (command OR score, not both).
            // Do not "fix" this by treating Used as scoreable.
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
                    <div class="tactic-card-info" role="button" tabindex="0" title="View card details">
                        <div class="tactic-card-name">${escapeHtml(tactic.name)}</div>
                        <div class="tactic-card-requirement">${escapeHtml(tactic.requirement || '')}</div>
                    </div>
                    <div class="tactic-card-actions">
                        <button class="tactic-action-btn score-btn" type="button">Score</button>
                    </div>
                `;
                const infoEl = card.querySelector('.tactic-card-info');
                const openDetails = () => openTacticModal(side.id, cardNumber, scoringModal);
                infoEl.addEventListener('click', openDetails);
                infoEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetails();
                    }
                });
                card.querySelector('.score-btn').addEventListener('click', () => {
                    setCardStatus(side, cardNumber, 'Scored');
                    if (!side.scores.rounds[match.currentRound]) {
                        side.scores.rounds[match.currentRound] = {
                            primary: 0,
                            tactics: 0,
                            twist: 0,
                            total: 0
                        };
                    }
                    side.scores.rounds[match.currentRound].tactics += 1;
                    card.remove();
                    updateModalScorePreview();
                    renderSideCards(side);
                });
                tacticsScoringEl.appendChild(card);
            });
        }

        setupTwistScoringControls();

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

        const tacticScore = isCustomRuleset()
            ? getCustomTacticScoreFromModal()
            : (side.scores.rounds[match.currentRound] || { tactics: 0 }).tactics;
        const twistScore = twistScoresAtEndOfTurn() ? pendingTwistPoints : 0;
        const roundTotal = primary + tacticScore + twistScore;

        let gameTotal = 0;
        Object.entries(side.scores.rounds).forEach(([roundNumber, roundScore]) => {
            if (parseInt(roundNumber, 10) !== match.currentRound) {
                gameTotal += roundScore.total || 0;
            }
        });
        gameTotal += roundTotal;

        document.getElementById('match-primary-score').textContent = primary;
        document.getElementById('match-tactic-score').textContent = tacticScore;
        const twistScoreEl = document.getElementById('match-twist-score');
        if (twistScoreEl) {
            twistScoreEl.textContent = twistScore;
            const twistRow = twistScoreEl.closest('.score-row');
            if (twistRow) {
                // Show twist row whenever twists are in play (even if this card is 0 / end-of-round)
                twistRow.style.display = usesTwists() ? '' : 'none';
            }
        }
        document.getElementById('match-round-total').textContent = roundTotal;
        document.getElementById('match-side-game-total').textContent = gameTotal;
    }

    function confirmScoring() {
        const side = match.sides[match.activeSide];
        let primary = 0;
        if (document.getElementById('match-primary-1').checked) primary++;
        if (document.getElementById('match-primary-2').checked) primary++;
        if (document.getElementById('match-primary-3').checked) primary++;

        const tacticScore = isCustomRuleset()
            ? getCustomTacticScoreFromModal()
            : (side.scores.rounds[match.currentRound] || { tactics: 0 }).tactics;
        // Preserve any end-of-battle-round twist points already stored; only overwrite for end-of-turn twists
        const previousTwist = side.scores.rounds[match.currentRound]?.twist || 0;
        const twistScore = twistScoresAtEndOfTurn() ? pendingTwistPoints : previousTwist;
        const roundTotal = primary + tacticScore + twistScore;
        side.scores.rounds[match.currentRound] = {
            primary,
            tactics: tacticScore,
            twist: twistScore,
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
                <div class="tactic-card-info" role="button" tabindex="0" title="View card details">
                    <div class="tactic-card-name">${escapeHtml(tactic.name)}</div>
                    <div class="tactic-card-requirement">${escapeHtml(tactic.requirement || '')}</div>
                </div>
                <div class="tactic-card-actions">
                    <button class="tactic-action-btn keep-btn" type="button" data-action="keep">Keep</button>
                    <button class="tactic-action-btn bin-btn" type="button" data-action="discard">Discard</button>
                </div>
            `;
            const infoEl = el.querySelector('.tactic-card-info');
            const openDetails = () => openTacticModal(sideId, cardNumber, cardModal);
            infoEl.addEventListener('click', openDetails);
            infoEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetails();
                }
            });
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
        advanceAfterBothTurns();
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

        updateScoreDisplays();

        if (match.roundTurnsCompleted >= 2) {
            abilities.onPhaseOrTurnChange(match.sides);
            if (needsEndRoundTwistScoring()) {
                showEndRoundTwistModal();
            } else {
                finishEndOfRoundFlow();
            }
            return;
        }

        updateSharedDisplay();
    }

    function nextPhase() {
        if (
            scoringModal.style.display === 'flex' ||
            cardModal.style.display === 'flex' ||
            (endRoundTwistModal && endRoundTwistModal.style.display === 'flex') ||
            (twistModal && twistModal.style.display === 'flex') ||
            (tacticModal && tacticModal.style.display === 'flex')
        ) {
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

    function getVersusArtCandidates(side) {
        const data = side.factionData || {};
        const factionId = data.factionId || '';
        const folder = FACTION_IMAGE_FOLDERS[factionId] || factionId.replace(/-/g, '_');
        const candidates = [];

        // Prefer explicit JSON, then drop-in versus art, then any faction banner
        if (data.versusArtUrl) candidates.push(data.versusArtUrl);
        if (folder) {
            candidates.push(`images/${folder}/versus.png`);
            candidates.push(`images/${folder}/versus.jpg`);
            candidates.push(`images/${folder}/versus.webp`);
        }
        if (data.factionImageUrl) candidates.push(data.factionImageUrl);

        return [...new Set(candidates.filter(Boolean))];
    }

    function preloadImage(url) {
        return new Promise((resolve) => {
            if (!url) {
                resolve({ url, ok: false });
                return;
            }
            const img = new Image();
            img.onload = () => resolve({ url, ok: true });
            img.onerror = () => resolve({ url, ok: false });
            img.src = url;
        });
    }

    /** Resolve the first versus art URL that actually loads (or null). */
    async function resolveVersusArtUrl(side) {
        const candidates = getVersusArtCandidates(side);
        for (const url of candidates) {
            const result = await preloadImage(url);
            if (result.ok) return url;
        }
        return null;
    }

    function applyVersusPanelTheme(sideId, side, preloadedUrl = null) {
        const panel = document.getElementById(`versus-panel-${sideId}`);
        const nameEl = document.getElementById(`versus-name-${sideId}`);
        const pathHint = document.getElementById(`versus-art-path-${sideId}`);
        const img = document.getElementById(`versus-art-${sideId}`);
        const placeholder = document.getElementById(`versus-placeholder-${sideId}`);
        if (!panel || !side) return;

        const factionId = side.factionData?.factionId || '';
        const folder = FACTION_IMAGE_FOLDERS[factionId] || factionId.replace(/-/g, '_');
        const theme = FACTION_VS_COLORS[factionId] || { color: '#60a5fa', rgb: '96, 165, 250' };
        panel.style.setProperty('--vs-color', theme.color);
        panel.style.setProperty('--vs-color-rgb', theme.rgb);

        if (nameEl) nameEl.textContent = side.displayName || `Side ${sideId}`;

        // Always show the conventional drop path so art uploads are obvious
        if (pathHint) pathHint.textContent = `images/${folder || 'faction'}/versus.png`;

        if (img) {
            img.hidden = true;
            img.removeAttribute('src');
            img.alt = side.displayName || '';
        }
        panel.classList.remove('has-versus-art');
        if (placeholder) {
            placeholder.hidden = false;
            placeholder.style.display = '';
        }

        if (!img) return;

        // Prefer a URL already verified by preload; otherwise fall back to candidate walk
        const applyUrl = (url) => {
            if (!url) {
                console.log(`Versus art missing for Side ${sideId}`);
                return;
            }
            img.onload = () => {
                img.hidden = false;
                if (placeholder) {
                    placeholder.hidden = true;
                    placeholder.style.display = 'none';
                }
                panel.classList.add('has-versus-art');
                console.log(`Versus art loaded for Side ${sideId}:`, url);
            };
            img.onerror = () => {
                img.hidden = true;
                panel.classList.remove('has-versus-art');
                if (placeholder) {
                    placeholder.hidden = false;
                    placeholder.style.display = '';
                }
            };
            img.src = url;
            // Cached preloads often fire synchronously; ensure visible if already complete
            if (img.complete && img.naturalWidth > 0) {
                img.hidden = false;
                if (placeholder) {
                    placeholder.hidden = true;
                    placeholder.style.display = 'none';
                }
                panel.classList.add('has-versus-art');
            }
        };

        if (preloadedUrl) {
            applyUrl(preloadedUrl);
            return;
        }

        const candidates = getVersusArtCandidates(side);
        if (!candidates.length) return;

        let attempt = 0;
        const tryNext = () => {
            if (attempt >= candidates.length) {
                applyUrl(null);
                console.log(`Versus art missing for Side ${sideId}; tried`, candidates);
                return;
            }
            const url = candidates[attempt++];
            img.onload = () => {
                img.hidden = false;
                if (placeholder) {
                    placeholder.hidden = true;
                    placeholder.style.display = 'none';
                }
                panel.classList.add('has-versus-art');
                console.log(`Versus art loaded for Side ${sideId}:`, url);
            };
            img.onerror = tryNext;
            img.src = url;
        };
        tryNext();
    }

    async function showVersusScreen() {
        if (!versusScreen) {
            showTurnOrderSelection();
            return;
        }

        // Keep the splash hidden until art is ready so the clash doesn't fire on empty panels
        if (startMatchBtn) {
            startMatchBtn.disabled = true;
            startMatchBtn.textContent = 'Loading…';
        }
        if (versusContinueBtn) {
            versusContinueBtn.disabled = true;
        }

        let urlA = null;
        let urlB = null;
        try {
            [urlA, urlB] = await Promise.all([
                resolveVersusArtUrl(match.sides.A),
                resolveVersusArtUrl(match.sides.B)
            ]);
        } catch (err) {
            console.warn('Versus art preload failed', err);
        }

        applyVersusPanelTheme('A', match.sides.A, urlA);
        applyVersusPanelTheme('B', match.sides.B, urlB);

        versusScreen.classList.remove('is-animating');
        versusScreen.style.display = 'flex';
        versusScreen.classList.add('is-visible');
        versusScreen.setAttribute('aria-hidden', 'false');
        document.body.classList.add('versus-open');
        // Force reflow so adding is-animating retriggers keyframes after art is in place
        void versusScreen.offsetWidth;
        versusScreen.classList.add('is-animating');

        if (versusContinueBtn) {
            versusContinueBtn.disabled = false;
            versusContinueBtn.textContent = 'Continue';
        }
        if (startMatchBtn) {
            startMatchBtn.textContent = 'Start Match';
            updateStartMatchGate();
        }

        versusShownThisMatch = true;
        console.log('Versus screen shown', {
            A: match.sides.A?.displayName,
            B: match.sides.B?.displayName,
            artA: urlA,
            artB: urlB
        });
    }

    function hideVersusScreen() {
        if (!versusScreen) return;
        versusScreen.classList.remove('is-visible', 'is-animating');
        versusScreen.style.display = 'none';
        versusScreen.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('versus-open');
    }

    function dismissVersusAndContinue() {
        hideVersusScreen();
        showTurnOrderSelection();
    }

    function showTurnOrderSelection() {
        setupPanel.style.display = 'none';
        inProgressPanel.style.display = 'none';
        hideSeizePanels();
        turnOrderPanel.style.display = 'block';
        roundNumberEl.textContent = match.currentRound;

        // Pre-battle checklist is only for the pre-start panel
        const preBattle = document.getElementById('pre-battle-steps');
        if (preBattle) preBattle.style.display = 'none';

        sideAFirstBtn.textContent = `${match.sides.A.displayName} Goes First`;
        sideBFirstBtn.textContent = `${match.sides.B.displayName} Goes First`;
    }

    function finalizeRoundStart(sideId, options = {}) {
        const skipDrawForSide = options.skipDrawForSide || null;
        match.pendingFirstSide = null;
        hideSeizePanels();

        match.startingSide = sideId;
        match.activeSide = sideId;
        match.roundTurnsCompleted = 0;
        match.currentPhase = 0;
        turnOrderPanel.style.display = 'none';
        inProgressPanel.style.display = 'flex';
        match.isActive = true;

        // Lock underdog from current totals for this whole round
        determineUnderdogForRound();

        // Draw battle tactics + shared twist together at round start (every round)
        const cardsAlreadyDrawn = Boolean(match.sides.A?.cardsByRound?.[match.currentRound]);
        if (usesBattleTacticCards() && !cardsAlreadyDrawn) {
            drawCardsForRound({ skipDrawForSide });
        }
        drawTwistForRound();

        updateSharedDisplay();
        console.log(`Round ${match.currentRound} starting with Side ${sideId}`, {
            twist: match.currentTwist?.name || null,
            underdogSide: match.underdogSide,
            seizeSkipDraw: skipDrawForSide
        });
    }

    function beginRoundWithStartingSide(sideId) {
        match.pendingFirstSide = sideId;

        // Underdog must be known before the 5+ seize exemption check
        determineUnderdogForRound();

        if (couldBeSeizingInitiative(sideId)) {
            if (isSeizeDrawExempt(sideId)) {
                console.log('Potential seize but exempt (underdog by 5+ VP) — normal draw');
                finalizeRoundStart(sideId, { skipDrawForSide: null });
                return;
            }
            showSeizeChoiceModal(sideId);
            return;
        }

        finalizeRoundStart(sideId, { skipDrawForSide: null });
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
        if (twistModal) twistModal.style.display = 'none';
        if (endRoundTwistModal) endRoundTwistModal.style.display = 'none';
        hideSeizePanels();
        gameOverModal.style.display = 'flex';
        console.log('Match over', { a, b });
    }

    async function loadFactionForSide(side) {
        const response = await fetch(side.factionFile);
        if (!response.ok) throw new Error(`Failed to load ${side.factionFile}`);
        const data = await response.json();
        applyEnhancementEffects(data, side.enhancement);
        side.factionData = data;
        side.displayName = data.spearheadName
            ? `${data.factionName || side.displayName} — ${data.spearheadName}`
            : (data.factionName || side.displayName);
        abilities.prepareSide(side);

        const factionId = data.factionId || '';
        const panel = document.getElementById(`side-panel-${side.id}`);
        const scorePill = document.querySelector(`.match-score-pill[data-side="${side.id}"]`);

        // Replace any previous faction theme class on this panel/pill only
        const themeClasses = FACTION_THEME_CLASSES;
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

    async function loadBattleTacticsForRuleset(ruleset) {
        if (ruleset === 'custom') {
            battleTactics = [];
            console.log('Custom ruleset — no battle tactic cards loaded');
            return;
        }

        const file = RULESET_FILES[ruleset] || RULESET_FILES['fire-and-jade'];
        const tacticsRes = await fetch(file);
        if (!tacticsRes.ok) throw new Error(`Failed to load battle tactics from ${file}`);
        const tacticsData = await tacticsRes.json();
        battleTactics = tacticsData.battleTactics || [];

        // Keep deck in sync with whatever pack was loaded
        const cardNumbers = battleTactics.map((t) => t.cardNumber).filter(Boolean);
        ['A', 'B'].forEach((id) => {
            if (match.sides[id]) {
                match.sides[id].allCards = cardNumbers.length
                    ? [...cardNumbers]
                    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            }
        });
        console.log(`Loaded ${battleTactics.length} tactics for ruleset ${ruleset} from ${file}`);
    }

    async function loadTwistsData() {
        if (isCustomRuleset()) {
            twistsData = { rulesets: {} };
            console.log('Custom ruleset — skipping twists.json load');
            return;
        }
        try {
            const res = await fetch('data/twists.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            twistsData = await res.json();
            console.log('Loaded twists data for rulesets', Object.keys(twistsData.rulesets || {}));
        } catch (err) {
            console.error('Failed to load twists.json', err);
            twistsData = { rulesets: {} };
            throw new Error('Failed to load twists.json');
        }
    }

    function selectTwistDeck(deckId) {
        const decks = getAvailableTwistDecks();
        const deck = decks.find((d) => d.id === deckId) || null;
        match.twistDeckId = deck ? deck.id : null;
        activeTwistDeck = deck;
        persistTwistDeckSelection(match.twistDeckId);
        applyRulesetChrome();
        updateStartMatchGate();
        console.log('Twist deck selected', match.twistDeckId, activeTwistDeck?.name);
    }

    function renderTwistDeckPicker(preferredDeckId) {
        const picker = document.getElementById('twist-deck-picker');
        const optionsEl = document.getElementById('twist-deck-options');
        if (!picker || !optionsEl) return;

        if (!usesTwists()) {
            picker.style.display = 'none';
            optionsEl.innerHTML = '';
            match.twistDeckId = null;
            activeTwistDeck = null;
            updateStartMatchGate();
            return;
        }

        const decks = getAvailableTwistDecks();
        picker.style.display = 'block';
        optionsEl.innerHTML = '';

        if (!decks.length) {
            optionsEl.innerHTML = '<p class="twist-deck-empty">No twist decks found for this ruleset.</p>';
            updateStartMatchGate();
            return;
        }

        decks.forEach((deck) => {
            const label = document.createElement('label');
            label.className = 'twist-deck-option';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'twist-deck';
            input.value = deck.id;
            if (preferredDeckId && preferredDeckId === deck.id) {
                input.checked = true;
            }
            const body = document.createElement('span');
            body.className = 'twist-deck-option-body';
            body.innerHTML = `
                <span class="twist-deck-option-title">${escapeHtml(deck.name)}</span>
                <span class="twist-deck-option-desc">${(deck.twists || []).length} twist cards</span>
            `;
            input.addEventListener('change', () => {
                if (input.checked) {
                    optionsEl.querySelectorAll('.twist-deck-option').forEach((el) => {
                        el.classList.remove('selected');
                    });
                    label.classList.add('selected');
                    selectTwistDeck(deck.id);
                }
            });
            label.appendChild(input);
            label.appendChild(body);
            optionsEl.appendChild(label);
            if (input.checked) {
                label.classList.add('selected');
            }
        });

        if (preferredDeckId && decks.some((d) => d.id === preferredDeckId)) {
            selectTwistDeck(preferredDeckId);
        } else {
            match.twistDeckId = null;
            activeTwistDeck = null;
            updateStartMatchGate();
        }
    }

    async function initMatchBoard(setup) {
        match.ruleset = setup.ruleset || 'fire-and-jade';
        match.twistDeckId = null;
        match.currentTwist = null;
        match.twistByRound = {};
        match.drawnTwistIds = [];
        match.underdogSide = null;
        match.lastRoundSecondSide = null;
        match.pendingFirstSide = null;
        activeTwistDeck = null;

        match.sides.A = createSideState(setup.sideA, 'A');
        match.sides.B = createSideState(setup.sideB, 'B');

        await loadBattleTacticsForRuleset(match.ruleset);
        await loadTwistsData();

        await Promise.all([loadFactionForSide(match.sides.A), loadFactionForSide(match.sides.B)]);
        abilities.populateUnifiedPhaseRules(match.sides);

        sideAFirstBtn.textContent = `${match.sides.A.displayName} Goes First`;
        sideBFirstBtn.textContent = `${match.sides.B.displayName} Goes First`;
        updateScoreDisplays();
        applyRulesetChrome();
        renderTwistDeckPicker(setup.twistDeck || null);
        renderCurrentTwistSlot();

        // Keep page chrome neutral so each column owns its faction colours
        document.body.className = 'match-page';

        missingSetupEl.style.display = 'none';
        matchBoardEl.style.display = 'block';

        const preBattle = document.getElementById('pre-battle-steps');
        if (preBattle) preBattle.style.display = '';
        if (setupPanel) setupPanel.style.display = '';

        console.log('Match board ready', {
            ruleset: match.ruleset,
            twistDeck: match.twistDeckId,
            sides: match.sides
        });
    }

    // --- Events ---
    startMatchBtn.addEventListener('click', () => {
        if (usesTwists() && !activeTwistDeck) {
            alert('Please select a twist deck before starting the match.');
            return;
        }
        // Intro splash once per board load, then turn-order selection
        if (!versusShownThisMatch) {
            showVersusScreen();
        } else {
            showTurnOrderSelection();
        }
    });

    if (versusContinueBtn) {
        versusContinueBtn.addEventListener('click', dismissVersusAndContinue);
    }

    sideAFirstBtn.addEventListener('click', () => beginRoundWithStartingSide('A'));
    sideBFirstBtn.addEventListener('click', () => beginRoundWithStartingSide('B'));

    if (seizeYesBtn) {
        seizeYesBtn.addEventListener('click', () => {
            const sideId = match.pendingFirstSide;
            if (!sideId) return;
            showSeizeWarningModal(sideId);
        });
    }
    if (seizeForcedBtn) {
        seizeForcedBtn.addEventListener('click', () => {
            const sideId = match.pendingFirstSide;
            if (!sideId) return;
            console.log('Forced double turn — normal battle tactic draw');
            finalizeRoundStart(sideId, { skipDrawForSide: null });
        });
    }
    if (seizeChoiceBackBtn) {
        seizeChoiceBackBtn.addEventListener('click', returnToTurnOrderFromSeize);
    }
    if (seizeConfirmBtn) {
        seizeConfirmBtn.addEventListener('click', () => {
            const sideId = match.pendingFirstSide;
            if (!sideId) return;
            finalizeRoundStart(sideId, { skipDrawForSide: sideId });
        });
    }
    if (seizeWarningBackBtn) {
        seizeWarningBackBtn.addEventListener('click', () => {
            // Back to seize vs forced choice (keep pendingFirstSide)
            if (seizeWarningPanel) seizeWarningPanel.style.display = 'none';
            if (match.pendingFirstSide) showSeizeChoiceModal(match.pendingFirstSide);
        });
    }

    nextPhaseBtn.addEventListener('click', nextPhase);
    endGameBtn.addEventListener('click', () => {
        if (confirm('End the match early?')) {
            endMatch('Match ended early.');
        }
    });

    confirmScoringBtn.addEventListener('click', confirmScoring);
    confirmCardsBtn.addEventListener('click', confirmCardManagement);

    function closeTacticModal() {
        tacticModal.style.display = 'none';
        tacticModal.classList.remove('modal-stack-top');
        openTacticContext = null;
        if (previousModal) {
            previousModal.style.display = 'flex';
            previousModal = null;
        }
    }

    closeTacticBtn.addEventListener('click', closeTacticModal);

    if (closeTwistBtn) {
        closeTwistBtn.addEventListener('click', closeTwistModal);
    }

    const twistViewBtn = document.getElementById('match-twist-scoring-view-btn');
    if (twistViewBtn) {
        twistViewBtn.addEventListener('click', () => {
            if (match.currentTwist) openTwistModal(match.currentTwist);
        });
    }

    const endRoundTwistViewBtn = document.getElementById('match-end-round-twist-view-btn');
    if (endRoundTwistViewBtn) {
        endRoundTwistViewBtn.addEventListener('click', () => {
            if (match.currentTwist) openTwistModal(match.currentTwist);
        });
    }

    if (confirmEndRoundTwistBtn) {
        confirmEndRoundTwistBtn.addEventListener('click', confirmEndRoundTwistScoring);
    }

    document.querySelectorAll('#match-end-round-twist-modal .twist-points-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const sideId = btn.dataset.side;
            const dir = parseInt(btn.dataset.dir, 10) || 0;
            const max = getCurrentTwistMaxPoints();
            const next = Math.max(0, Math.min(max, (endRoundTwistDraft[sideId] || 0) + dir));
            endRoundTwistDraft[sideId] = next;
            const input = document.getElementById(`end-round-twist-points-${sideId}`);
            if (input) input.value = String(next);
        });
    });

    const twistMinusBtn = document.getElementById('match-twist-points-minus');
    const twistPlusBtn = document.getElementById('match-twist-points-plus');
    if (twistMinusBtn) {
        twistMinusBtn.addEventListener('click', () => {
            setPendingTwistPoints(pendingTwistPoints - 1);
            updateModalScorePreview();
        });
    }
    if (twistPlusBtn) {
        twistPlusBtn.addEventListener('click', () => {
            setPendingTwistPoints(pendingTwistPoints + 1);
            updateModalScorePreview();
        });
    }

    useCommandBtn.addEventListener('click', () => {
        if (!openTacticContext) return;
        const side = match.sides[openTacticContext.sideId];
        if (getCardStatus(side, openTacticContext.cardNumber) !== 'Pending') return;
        // INTENTIONAL: Used removes the card from end-of-turn scoring (command OR score).
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
            closeTacticModal();
        }
        if (event.target === twistModal) {
            closeTwistModal();
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
